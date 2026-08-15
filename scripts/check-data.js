#!/usr/bin/env node

// Consistency check for the project data. There is no build step and no test
// runner here, so this covers the one class of mistake the browser will never
// report: data that is well-formed but wrong — an image path that points at
// nothing, a preview that was never generated, a typology no filter button
// offers. All of those fail silently on the live site.
//
//   node scripts/check-data.js
//
// Exits 1 on an error, 0 on warnings alone.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const projectDataPath = path.join(root, "scripts", "mineport-project-data.js");
const indexPath = path.join(root, "index.html");

const errors = [];
const warnings = [];

function fail(message) {
    errors.push(message);
}

function warn(message) {
    warnings.push(message);
}

function readProjectData() {
    const context = { window: {} };
    vm.createContext(context);
    // The data file is a classic script written for the browser, so it is run in a
    // sandbox with a fake `window` rather than imported.
    vm.runInContext(fs.readFileSync(projectDataPath, "utf8"), context, { filename: projectDataPath });

    return {
        published: Array.isArray(context.window.MINEPORT_PROJECT_DETAIL_DATA)
            ? context.window.MINEPORT_PROJECT_DETAIL_DATA
            : [],
        unpublished: Array.isArray(context.window.MINEPORT_UNPUBLISHED_PROJECT_DATA)
            ? context.window.MINEPORT_UNPUBLISHED_PROJECT_DATA
            : []
    };
}

// "../assets/images/x.jpg?v=3" -> "assets/images/x.jpg". Browsers clamp the leading
// "../" against the document root; on disk it is simply the repo-relative path.
function toRepoRelative(imageUrl) {
    return String(imageUrl).split("?")[0].replace(/^(\.\.\/)+/, "");
}

function toPreviewPath(imagePath) {
    return imagePath
        .replace(/^assets\/images\//, "assets/images/previews/")
        .replace(/\.[^/.]+$/, ".jpg");
}

function collectAttribute(markup, pattern) {
    const values = [];
    let match = pattern.exec(markup);

    while (match) {
        values.push(match[1]);
        match = pattern.exec(markup);
    }

    return values;
}

const data = readProjectData();
const projects = data.published;
const markup = fs.readFileSync(indexPath, "utf8");

// --- shape -----------------------------------------------------------------

if (!projects.length) {
    fail("No published projects: window.MINEPORT_PROJECT_DETAIL_DATA is empty.");
}

const requiredFields = ["title", "typology", "category", "year", "cardImage"];

projects.forEach(function (detail, index) {
    const label = "project " + (index + 1);

    requiredFields.forEach(function (field) {
        if (!detail[field]) {
            fail(label + ": missing " + field + ".");
        }
    });

    if (!(detail.images || []).length) {
        fail(label + " (" + detail.title + "): no detail images.");
    }

    if (!(detail.galleryImages || []).length) {
        fail(label + " (" + detail.title + "): no gallery images.");
    }
});

const titleCounts = {};

projects.forEach(function (detail) {
    const title = String(detail.title || "");
    titleCounts[title] = (titleCounts[title] || 0) + 1;
});

Object.keys(titleCounts).forEach(function (title) {
    if (titleCounts[title] > 1) {
        warn("Duplicate title \"" + title + "\" on " + titleCounts[title] + " projects — the two are told apart only by their location line.");
    }
});

// --- images exist, and have previews ----------------------------------------

const checkedImages = new Set();
let imageCount = 0;

function checkImage(imageUrl, label) {
    const repoPath = toRepoRelative(imageUrl);

    if (String(imageUrl).indexOf("?v=") === -1) {
        warn(label + ": " + repoPath + " has no ?v= — changing the file in place will leave stale copies in browsers.");
    }

    if (checkedImages.has(repoPath)) {
        return;
    }

    checkedImages.add(repoPath);
    imageCount += 1;

    if (!fs.existsSync(path.join(root, repoPath))) {
        fail(label + ": image not on disk — " + repoPath);
        return;
    }

    if (!fs.existsSync(path.join(root, toPreviewPath(repoPath)))) {
        fail(label + ": no preview for " + repoPath + " — run `node scripts/generate-previews.js`.");
    }
}

projects.forEach(function (detail, index) {
    const label = "project " + (index + 1) + " (" + detail.title + ")";

    if (detail.cardImage) {
        checkImage(detail.cardImage, label + " card");
    }

    (detail.images || []).forEach(function (imageUrl) {
        checkImage(imageUrl, label + " detail");
    });

    (detail.galleryImages || []).forEach(function (imageUrl) {
        checkImage(imageUrl, label + " gallery");
    });
});

// --- the filters in index.html still cover the data -------------------------

const categoryOptions = collectAttribute(markup, /data-filter="([^"]+)"/g);
const yearOptions = collectAttribute(markup, /data-year-filter="([^"]+)"/g);
const typologyOptions = collectAttribute(markup, /data-typology-filter="([^"]+)"/g);

const usedCategories = new Set();
const usedTypologies = new Set();

projects.forEach(function (detail, index) {
    const label = "project " + (index + 1) + " (" + detail.title + ")";
    const category = String(detail.category || "").toLowerCase();
    const typology = String(detail.typology || "").toLowerCase();
    const year = String(detail.year || "");

    usedCategories.add(category);
    usedTypologies.add(typology);

    if (category && categoryOptions.indexOf(category) === -1) {
        fail(label + ": category \"" + detail.category + "\" has no button in index.html, so the card is unreachable from the category filter.");
    }

    if (typology && typologyOptions.indexOf(typology) === -1) {
        fail(label + ": typology \"" + detail.typology + "\" has no button in the typology panel.");
    }

    // The year filter matches by substring, the same way project-grid.js does.
    const isYearReachable = yearOptions.some(function (option) {
        return option !== "all" && year.indexOf(option) !== -1;
    });

    if (year && !isYearReachable) {
        warn(label + ": year \"" + year + "\" matches no option in the time panel — the card only ever shows under \"All\".");
    }
});

// A filter nobody matches renders as a button that empties the grid.
categoryOptions.forEach(function (option) {
    if (option !== "all" && !usedCategories.has(option)) {
        warn("Category filter \"" + option + "\" matches no published project.");
    }
});

typologyOptions.forEach(function (option) {
    if (option !== "all" && !usedTypologies.has(option)) {
        warn("Typology filter \"" + option + "\" matches no published project.");
    }
});

// --- the grid is still data-driven ------------------------------------------

if (/<article[^>]*class="[^"]*project-card/.test(markup)) {
    fail("index.html contains a hand-written .project-card. Cards are rendered from the data file now; static markup would be appended before them and shift every index.");
}

// --- report ------------------------------------------------------------------

console.log("Checked " + projects.length + " published project" + (projects.length === 1 ? "" : "s")
    + " (" + data.unpublished.length + " parked) and " + imageCount + " images.");

warnings.forEach(function (message) {
    console.warn("warn  " + message);
});

errors.forEach(function (message) {
    console.error("error " + message);
});

if (errors.length) {
    console.error("\n" + errors.length + " error" + (errors.length === 1 ? "" : "s") + ".");
    process.exit(1);
}

console.log(warnings.length ? "\nNo errors, " + warnings.length + " warning(s)." : "\nAll checks passed.");
