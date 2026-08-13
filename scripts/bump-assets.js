#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const indexPath = process.argv[2]
    ? path.resolve(root, process.argv[2])
    : path.join(root, "index.html");

// index.html: <link href="styles/x.css?v=1"> and <script src="scripts/main.js?v=1">
const markupPattern = /((?:href|src)="(?:styles|scripts)\/[^"]+\.(?:css|js)\?v=)(\d+)(")/g;
// module graph: import { x } from "./core/utils.js?v=1"
const importPattern = /(from "\.{1,2}\/[^"]+\.js\?v=)(\d+)(")/g;

function bump(filePath, pattern) {
    const source = fs.readFileSync(filePath, "utf8");
    let count = 0;

    const next = source.replace(pattern, function (match, prefix, version, suffix) {
        count += 1;
        return prefix + (Number(version) + 1) + suffix;
    });

    if (count) {
        fs.writeFileSync(filePath, next);
    }

    return count;
}

function collectModules(dir, files) {
    if (!fs.existsSync(dir)) {
        return files;
    }

    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            collectModules(fullPath, files);
            return;
        }

        if (entry.name.endsWith(".js")) {
            files.push(fullPath);
        }
    });

    return files;
}

const markupCount = bump(indexPath, markupPattern);

// The ?v= on index.html's module entry does not reach the modules it imports, so
// every relative import specifier carries its own version and is bumped in step.
const moduleFiles = [path.join(root, "scripts", "main.js")]
    .filter(fs.existsSync)
    .concat(collectModules(path.join(root, "scripts", "core"), []))
    .concat(collectModules(path.join(root, "scripts", "components"), []));

let importCount = 0;
moduleFiles.forEach(function (filePath) {
    importCount += bump(filePath, importPattern);
});

if (!markupCount && !importCount) {
    console.error("No versioned asset references found.");
    process.exit(1);
}

console.log("Bumped " + markupCount + " reference" + (markupCount === 1 ? "" : "s") + " in " + path.relative(root, indexPath) + ".");
console.log("Bumped " + importCount + " import specifier" + (importCount === 1 ? "" : "s") + " across " + moduleFiles.length + " modules.");
