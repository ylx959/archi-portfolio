#!/usr/bin/env node

// Cache busting. Every CSS link and script src in index.html, and every relative
// import specifier inside the modules, carries a ?v= — because index.html's own
// version does not reach the modules it imports, and browsers cache each module
// URL separately.
//
//   node scripts/bump-assets.js
//
// The version is the first 8 hex digits of the file's content hash, not a counter.
// That matters in two ways:
//
//   - Only files that actually changed get a new URL. A global counter expired
//     every asset on every run, so editing one stylesheet made returning visitors
//     re-download all of them.
//   - Running this twice in a row changes nothing. There is no way to "bump too
//     far", and the output is a function of the tree rather than of how many times
//     the script has been run.
//
// A module's hash is taken *after* its own imports have been rewritten, so a change
// deep in core/ cascades outward: utils.js gets a new hash, every module importing
// it now has different bytes and so a new hash of its own, up to main.js and the
// tag in index.html. That cascade is the whole point — a stale importer pointing at
// a fresh dependency is exactly the bug ?v= exists to prevent.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const indexPath = process.argv[2]
    ? path.resolve(root, process.argv[2])
    : path.join(root, "index.html");

// import { x } from "./core/utils.js?v=660387f7" — the ?v= is optional so that a
// freshly written import gets stamped rather than skipped.
const importPattern = /(from\s+")(\.{1,2}\/[^"?]+\.js)(?:\?v=[0-9a-z]+)?(")/g;
// index.html: <link href="styles/x.css?v=…"> and <script src="scripts/main.js?v=…">
const markupPattern = /((?:href|src)=")((?:styles|scripts)\/[^"?]+\.(?:css|js))(?:\?v=[0-9a-z]+)?(")/g;

const hashes = new Map();
const resolving = new Set();
const rewritten = new Map();
const cycles = [];

function collectFiles(dir, extension, files) {
    if (!fs.existsSync(dir)) {
        return files;
    }

    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            collectFiles(fullPath, extension, files);
            return;
        }

        if (entry.name.endsWith(extension)) {
            files.push(fullPath);
        }
    });

    return files;
}

function hashContent(content) {
    return crypto.createHash("md5").update(content).digest("hex").slice(0, 8);
}

// Returns the file's version, resolving its dependencies first. Depth-first over
// the import graph, memoised, so each file is read and hashed once however many
// modules import it.
function getVersion(filePath) {
    if (hashes.has(filePath)) {
        return hashes.get(filePath);
    }

    if (!fs.existsSync(filePath)) {
        return null;
    }

    if (resolving.has(filePath)) {
        // The module graph is meant to be acyclic (see CLAUDE.md); if it ever is
        // not, hash what is on disk rather than recursing forever, and say so.
        cycles.push(path.relative(root, filePath));
        return hashContent(fs.readFileSync(filePath));
    }

    resolving.add(filePath);

    const original = fs.readFileSync(filePath, "utf8");
    let next = original;

    if (filePath.endsWith(".js")) {
        next = original.replace(importPattern, function (match, prefix, specifier, suffix) {
            const dependencyPath = path.resolve(path.dirname(filePath), specifier);
            const dependencyVersion = getVersion(dependencyPath);

            if (!dependencyVersion) {
                console.warn("warn  " + path.relative(root, filePath) + " imports a missing file: " + specifier);
                return match;
            }

            return prefix + specifier + "?v=" + dependencyVersion + suffix;
        });
    }

    resolving.delete(filePath);

    const version = hashContent(next);
    hashes.set(filePath, version);

    if (next !== original) {
        rewritten.set(filePath, next);
    }

    return version;
}

const assetFiles = collectFiles(path.join(root, "scripts"), ".js", [])
    .concat(collectFiles(path.join(root, "styles"), ".css", []));

assetFiles.forEach(getVersion);

let importCount = 0;
let changedModules = 0;

rewritten.forEach(function (content, filePath) {
    fs.writeFileSync(filePath, content);
    changedModules += 1;
});

assetFiles.forEach(function (filePath) {
    if (!filePath.endsWith(".js")) {
        return;
    }

    const source = fs.readFileSync(filePath, "utf8");
    const matches = source.match(importPattern);
    importCount += matches ? matches.length : 0;
});

const markup = fs.readFileSync(indexPath, "utf8");
let markupCount = 0;
let missingMarkupTargets = 0;

const nextMarkup = markup.replace(markupPattern, function (match, prefix, assetPath, suffix) {
    const version = getVersion(path.join(root, assetPath));

    if (!version) {
        console.warn("warn  " + path.relative(root, indexPath) + " references a missing file: " + assetPath);
        missingMarkupTargets += 1;
        return match;
    }

    markupCount += 1;
    return prefix + assetPath + "?v=" + version + suffix;
});

if (nextMarkup !== markup) {
    fs.writeFileSync(indexPath, nextMarkup);
}

if (!markupCount && !importCount) {
    console.error("No versioned asset references found.");
    process.exit(1);
}

console.log("Stamped " + markupCount + " reference" + (markupCount === 1 ? "" : "s") + " in " + path.relative(root, indexPath) + ".");
console.log("Stamped " + importCount + " import specifier" + (importCount === 1 ? "" : "s") + " across " + assetFiles.length + " assets.");
console.log(changedModules ? "Rewrote " + changedModules + " module file(s)." : "Modules already up to date.");

if (cycles.length) {
    console.warn("warn  import cycle through: " + Array.from(new Set(cycles)).join(", "));
}

if (missingMarkupTargets) {
    process.exitCode = 1;
}
