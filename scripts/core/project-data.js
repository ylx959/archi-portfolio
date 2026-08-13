// Detail content for the project cards, published by scripts/mineport-project-data.js.
// Entries are matched to the static cards in index.html by array index, so anything
// past the last card is ignored.
const projectDetailData = Array.isArray(window.MINEPORT_PROJECT_DETAIL_DATA)
    ? window.MINEPORT_PROJECT_DETAIL_DATA
    : [];

const cardCount = document.querySelectorAll(".project-card").length;

export const projectDetails = projectDetailData.slice(0, cardCount);
