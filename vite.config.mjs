import { defineConfig } from "vite";

// The site is deployed to GitHub Pages as a *project* page, so the built URLs
// have to carry the repository name. That prefix is not known at authoring time
// (a custom domain would serve from "/"), so it comes in from the environment:
// the deploy workflow sets VITE_BASE, `npm run dev` gets the default.
//
// Everything that references an image goes through this base:
//   - index.html and the stylesheets write "/assets/…", which Vite rewrites at
//     build time;
//   - the project data file keeps its own "../assets/…" spelling and is
//     rewritten at runtime in core/project-data.js, via import.meta.env.BASE_URL.
const base = process.env.VITE_BASE || "/";

export default defineConfig({
    base: base,
    // 167 MB of photography lives under public/. Vite serves it verbatim in dev
    // and copies it into dist/ on build — the files are already sized by
    // scripts/compress-large-project-images.js and must not be hashed, because
    // the data file addresses them by name.
    publicDir: "public",
    server: {
        port: 8000,
        // A stale process on 8000 should be an error, not a silent move to 8001:
        // the modules are cached per URL and two ports means two caches.
        strictPort: true
    },
    build: {
        outDir: "dist",
        // Not the default "assets": public/assets is copied to dist/assets
        // verbatim, and the hashed bundles have no business sharing a folder
        // with the photography.
        assetsDir: "build",
        // The one thing worth seeing in the build log is an image that grew back
        // past the budget compress-large-project-images.js enforces.
        chunkSizeWarningLimit: 900,
        sourcemap: true
    }
});
