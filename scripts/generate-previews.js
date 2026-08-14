#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const projectDataPath = path.join(root, "scripts", "mineport-project-data.js");
const source = fs.readFileSync(projectDataPath, "utf8");
const context = { window: {} };
const shouldForce = process.argv.includes("--force");

vm.createContext(context);
vm.runInContext(source, context, { filename: projectDataPath });

const projectDetails = Array.isArray(context.window.MINEPORT_PROJECT_DETAIL_DATA)
    ? context.window.MINEPORT_PROJECT_DETAIL_DATA
    : [];

// Everything is reduced to a repo-relative "assets/images/…" first, because the
// two places images are declared spell the same file differently: the data file
// writes "../assets/images/…", while a stylesheet one folder deeper writes
// "../../assets/images/…".
function toRepoRelative(imageUrl) {
    return imageUrl.split("?")[0].replace(/^(\.\.\/)+/, "");
}

function getSourcePath(imagePath) {
    return path.join(root, imagePath);
}

function getPreviewPath(imagePath) {
    return path.join(root, imagePath
        .replace(/^assets\/images\//, "assets/images/previews/")
        .replace(/\.[^/.]+$/, ".jpg"));
}

const imageUrls = new Set();

projectDetails.forEach(function (detail) {
    (detail.images || []).forEach(function (imageUrl) {
        imageUrls.add(toRepoRelative(imageUrl));
    });

    (detail.galleryImages || []).forEach(function (imageUrl) {
        imageUrls.add(toRepoRelative(imageUrl));
    });
});

// Card thumbnails are not in the data file at all — they are background-image
// rules in the grid stylesheet. Read them from there rather than rebuilding the
// path convention here, so a card that moves its file stays covered.
const cardStylesheet = path.join(root, "styles", "components", "project-grid.css");

if (fs.existsSync(cardStylesheet)) {
    const stylesheet = fs.readFileSync(cardStylesheet, "utf8");
    const urlPattern = /url\(["']?((?:\.\.\/)+assets\/images\/[^"')]+)["']?\)/g;
    let cardMatch = urlPattern.exec(stylesheet);

    while (cardMatch) {
        imageUrls.add(toRepoRelative(cardMatch[1]));
        cardMatch = urlPattern.exec(stylesheet);
    }
}

let createdCount = 0;
let skippedCount = 0;
const missingSources = [];

imageUrls.forEach(function (imageUrl) {
    const sourcePath = getSourcePath(imageUrl);
    const previewPath = getPreviewPath(imageUrl);

    if (!fs.existsSync(sourcePath)) {
        missingSources.push(path.relative(root, sourcePath));
        return;
    }

    if (fs.existsSync(previewPath) && !shouldForce) {
        skippedCount += 1;
        return;
    }

    fs.mkdirSync(path.dirname(previewPath), { recursive: true });
    execFileSync("sips", [
        "-Z", "48",
        "-s", "format", "jpeg",
        "-s", "formatOptions", "45",
        sourcePath,
        "--out", previewPath
    ], { stdio: "ignore" });

    createdCount += 1;
});

console.log("Preview generation complete.");
console.log("Images found: " + imageUrls.size);
console.log("Created: " + createdCount);
console.log("Skipped: " + skippedCount);
console.log("Force: " + (shouldForce ? "yes" : "no"));

if (missingSources.length) {
    console.warn("Missing source images:");
    missingSources.forEach(function (sourcePath) {
        console.warn("- " + sourcePath);
    });
    process.exitCode = 1;
}
