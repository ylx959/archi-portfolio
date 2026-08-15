// Detail content for the project cards, published by scripts/mineport-project-data.js.
// This is now the whole list, not a slice: the cards are rendered from it (see
// project-grid.js), so there is no static markup for the array to be trimmed to
// and no index coupling left to get wrong.
//
// The data file is still a classic browser script that writes two globals, and
// deliberately so: scripts/check-data.js and scripts/generate-previews.js run it
// through `vm.runInContext()` with a fake `window`, which import/export syntax
// would break. Importing it for its side effect is enough — an ES module's
// imports are evaluated before its own body, so the globals are there by the
// time the next line reads them. That is also why index.html no longer needs a
// second <script> tag ahead of the module entry.
import "../mineport-project-data.js";

// The data file writes "../assets/images/…". On a site served from "/" the
// browser clamps that leading "../" away by itself, but a GitHub Pages project
// page is served from "/<repo>/", where the clamp would land outside the site.
// Vite rewrites "/assets/…" in index.html and the stylesheets at build time; it
// cannot rewrite a string built at runtime, so the same prefix is applied here.
const assetBase = import.meta.env.BASE_URL;

function toAssetUrl(imageUrl) {
    return String(imageUrl).replace(/^(?:\.\.\/)*assets\//, assetBase + "assets/");
}

function toAssetUrls(imageUrls) {
    return Array.isArray(imageUrls) ? imageUrls.map(toAssetUrl) : imageUrls;
}

function withResolvedImages(detail) {
    return Object.assign({}, detail, {
        cardImage: toAssetUrl(detail.cardImage),
        images: toAssetUrls(detail.images),
        galleryImages: toAssetUrls(detail.galleryImages)
    });
}

const projectDetailData = Array.isArray(window.MINEPORT_PROJECT_DETAIL_DATA)
    ? window.MINEPORT_PROJECT_DETAIL_DATA
    : [];

export const projectDetails = projectDetailData.map(withResolvedImages);
