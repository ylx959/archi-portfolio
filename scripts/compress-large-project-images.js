#!/usr/bin/env node

// Project images are shrunk to a sensible pixel size FIRST, then compressed to a
// byte budget. Doing it the other way round (quality-only, keep dimensions) is
// how the gallery ended up holding 9449px-wide files squeezed under 1MB: heavy
// artefacts AND a decode cost large enough to stall the browser after the bytes
// have already arrived.
//
// The overlay renders detail images around 900px CSS wide and gallery stage
// images near full-viewport, so these caps are already generous at 2x DPR.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const projectsRoot = path.join(root, "assets", "images", "projects");
const workDir = path.join(root, ".image-compress-tmp");

const maxDimensionFor = { detail: 1800, gallery: 2400, card: 1600 };
const targetBytes = 420000;
const jpegQualities = [86, 82, 78, 74, 70, 66];
const isDryRun = process.argv.includes("--dry-run");

function walk(dir, files) {
    if (!fs.existsSync(dir)) {
        return files;
    }

    fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            walk(fullPath, files);
            return;
        }

        files.push(fullPath);
    });

    return files;
}

function kindOf(filePath) {
    const relativePath = path.relative(projectsRoot, filePath);

    if (!/^project[1-9]\d*\//.test(relativePath) || !/\.(jpe?g|png)$/i.test(filePath)) {
        return null;
    }

    const match = relativePath.match(/\/(detail|gallery|card)\//);
    return match ? match[1] : null;
}

function readDimensions(filePath) {
    const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], { encoding: "utf8" });
    const width = Number((output.match(/pixelWidth:\s*(\d+)/) || [])[1]);
    const height = Number((output.match(/pixelHeight:\s*(\d+)/) || [])[1]);
    return { width, height };
}

function runSips(args) {
    execFileSync("sips", args, { stdio: "ignore" });
}

function candidatePath(filePath, label) {
    const target = path.join(workDir, path.relative(root, filePath) + "." + label + path.extname(filePath));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    return target;
}

// Produce the smallest file that stays within the pixel cap; only drop quality
// once the dimensions are already correct.
function processImage(filePath, kind) {
    const originalBytes = fs.statSync(filePath).size;
    const { width, height } = readDimensions(filePath);
    const cap = maxDimensionFor[kind];
    const longestSide = Math.max(width, height);
    const needsResize = longestSide > cap;
    const needsCompress = originalBytes > targetBytes;

    if (!needsResize && !needsCompress) {
        return null;
    }

    const isPng = path.extname(filePath).toLowerCase() === ".png";
    const qualities = isPng ? [null] : jpegQualities;
    let best = null;

    for (const quality of qualities) {
        const label = (needsResize ? cap : "same") + "-q" + (quality || "png");
        const target = candidatePath(filePath, label);
        const args = [];

        if (needsResize) {
            args.push("-Z", String(cap));
        }

        args.push("-s", "format", isPng ? "png" : "jpeg");

        if (quality) {
            args.push("-s", "formatOptions", String(quality));
        }

        args.push(filePath, "--out", target);
        runSips(args);

        const bytes = fs.statSync(target).size;

        if (!best || bytes < best.bytes) {
            if (best) {
                fs.rmSync(best.path, { force: true });
            }

            best = { path: target, bytes, label };
        } else {
            fs.rmSync(target, { force: true });
        }

        if (bytes <= targetBytes) {
            break;
        }
    }

    if (!best) {
        return null;
    }

    // Never let "optimising" make a file bigger than it started.
    if (best.bytes >= originalBytes && !needsResize) {
        fs.rmSync(best.path, { force: true });
        return null;
    }

    if (!isDryRun) {
        fs.copyFileSync(best.path, filePath);
    }

    fs.rmSync(best.path, { force: true });

    return {
        originalBytes,
        finalBytes: best.bytes,
        from: width + "x" + height,
        to: needsResize ? "≤" + cap : "unchanged",
        label: best.label
    };
}

if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
}

const targets = walk(projectsRoot, [])
    .map(function (filePath) {
        return { filePath, kind: kindOf(filePath) };
    })
    .filter(function (entry) {
        return entry.kind;
    });

console.log("Scanning " + targets.length + " project images" + (isDryRun ? " (dry run)" : "") + "\n");

let changed = 0;
let bytesBefore = 0;
let bytesAfter = 0;

targets.forEach(function (entry, index) {
    const result = processImage(entry.filePath, entry.kind);
    const relativePath = path.relative(root, entry.filePath);

    if (!result) {
        const bytes = fs.statSync(entry.filePath).size;
        bytesBefore += bytes;
        bytesAfter += bytes;
        return;
    }

    changed += 1;
    bytesBefore += result.originalBytes;
    bytesAfter += result.finalBytes;

    console.log(
        String(index + 1).padStart(3) + "/" + targets.length + "  " +
        relativePath.replace("assets/images/projects/", "") + "  " +
        result.from + " -> " + result.to + "  " +
        (result.originalBytes / 1000000).toFixed(2) + "MB -> " + (result.finalBytes / 1000000).toFixed(2) + "MB"
    );
});

fs.rmSync(workDir, { recursive: true, force: true });

console.log("\nRewritten: " + changed + " of " + targets.length);
console.log("Total: " + (bytesBefore / 1000000).toFixed(1) + "MB -> " + (bytesAfter / 1000000).toFixed(1) + "MB" +
    "  (" + Math.round((1 - bytesAfter / bytesBefore) * 100) + "% smaller)");
