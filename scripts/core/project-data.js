// Detail content for the project cards, published by scripts/mineport-project-data.js.
// This is now the whole list, not a slice: the cards are rendered from it (see
// project-grid.js), so there is no static markup for the array to be trimmed to
// and no index coupling left to get wrong.
const projectDetailData = Array.isArray(window.MINEPORT_PROJECT_DETAIL_DATA)
    ? window.MINEPORT_PROJECT_DETAIL_DATA
    : [];

export const projectDetails = projectDetailData;
