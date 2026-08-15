import { openProjectDetail } from "./project-detail.js?v=55d63d4b";
import { projectDetails } from "../core/project-data.js?v=a0074993";
import { getPreviewImageSrc } from "../core/utils.js?v=660387f7";

const viewToggle = document.getElementById("viewToggle");

const timeFilterToggle = document.getElementById("timeFilterToggle");

const timeFilterPanel = document.getElementById("timeFilterPanel");

const typologyFilterToggle = document.getElementById("typologyFilterToggle");

const typologyFilterPanel = document.getElementById("typologyFilterPanel");

const timeFilterOptions = timeFilterPanel
    ? timeFilterPanel.querySelectorAll(".time-filter-option")
    : [];

const typologyFilterOptions = typologyFilterPanel
    ? typologyFilterPanel.querySelectorAll(".typology-filter-option")
    : [];

const projectGrid = document.querySelector(".project-grid");

const categoryLinks = document.querySelectorAll(".category-link");

// Filled by initProjectGrid once the cards exist. It cannot be resolved at module
// load time any more, because at that point the grid is still empty.
export let projectCards = [];

let activeCategoryFilter = "all";

let activeYearFilter = "all";

let activeTypologyFilter = "all";

let timeFilterAutoCloseTimer = null;

let typologyFilterAutoCloseTimer = null;

let timeFilterCloseTimer = null;

let typologyFilterCloseTimer = null;

let projectEmptyState = null;

function toCssUrl(imageSrc) {
    return "url('" + encodeURI(imageSrc).replace(/'/g, "%27") + "')";
}

// "2024 Summer" reads as "2024, Summer" under the card. Derived rather than
// stored, so the year exists once in the data file instead of twice.
function formatProjectYear(year) {
    return String(year || "").replace(/\s+/, ", ");
}

// One card per published project. These used to be hand-written <article> blocks
// in index.html joined to the data file by array index alone — a card and its
// detail content could drift apart with nothing to report it, and adding a
// project meant editing the markup, the data file and the stylesheet in step.
function createProjectCard(detail, index) {
    const card = document.createElement("article");
    card.className = "project-card";
    // The filters read these; the panels in index.html list the values they offer,
    // and scripts/check-data.js is what checks the two still agree.
    card.dataset.category = String(detail.category || "").toLowerCase();
    card.dataset.year = detail.year || "";

    const image = document.createElement("div");
    // The numbered class no longer carries the picture. It stays as a hook for the
    // occasional framing tweak — project 8 crops low and drops the dust overlay —
    // so a new project needs no rule of its own.
    image.className = "project-image image-grid-" + String(index + 1).padStart(2, "0");

    if (detail.cardImage) {
        image.style.backgroundImage = toCssUrl(detail.cardImage);
    }

    const caption = document.createElement("div");
    caption.className = "project-caption";

    const title = document.createElement("h2");
    title.textContent = detail.title || "";

    const typology = document.createElement("p");
    typology.textContent = detail.typology || "";

    const year = document.createElement("p");
    year.textContent = formatProjectYear(detail.year);

    caption.appendChild(title);
    caption.appendChild(typology);
    caption.appendChild(year);
    card.appendChild(image);
    card.appendChild(caption);

    return card;
}

// The thumbnail is a CSS background, which fires no load event — so on its own it
// can only appear, mid-scroll, at full contrast. This gives the card the one thing
// the background cannot report: a probe on the same URL, which the browser serves
// from the very same cache entry, so nothing is downloaded twice. Until it answers
// the card wears the blurred preview.
function setupProjectCardImage(card, imageSrc) {
    if (!imageSrc) {
        return;
    }

    const probe = new Image();

    function settle() {
        card.classList.remove("is-image-pending");
        card.classList.add("is-image-loaded");
    }

    probe.decoding = "async";
    probe.src = imageSrc;

    // Reopening the page, or any project whose thumbnail is already cached, answers
    // in this frame. Those must not be hidden and faded back in — that would be a
    // flash backwards.
    if (probe.complete && probe.naturalWidth > 0) {
        card.classList.add("is-image-loaded");
        return;
    }

    card.style.setProperty("--preview-image", toCssUrl(getPreviewImageSrc(imageSrc)));
    card.classList.add("is-image-pending");
    // A missing or broken file settles too: better a card that reveals whatever
    // the background can show than one stuck behind a blur for good.
    probe.addEventListener("load", settle, { once: true });
    probe.addEventListener("error", settle, { once: true });
}

function applyProjectFilters() {
    let visibleCount = 0;

    projectCards.forEach(function (card, index) {
        const category = card.dataset.category;
        const yearText = card.dataset.year || "";
        const detail = projectDetails[index];
        const typology = ((detail && detail.typology) || "").toLowerCase();
        const matchesCategory = activeCategoryFilter === "all" || category === activeCategoryFilter;
        const matchesYear = activeYearFilter === "all" || yearText.indexOf(activeYearFilter) !== -1;
        const matchesTypology = activeTypologyFilter === "all" || typology === activeTypologyFilter;
        const shouldShow = matchesCategory && matchesYear && matchesTypology;
        card.style.display = shouldShow ? "" : "none";

        if (shouldShow) {
            visibleCount += 1;
        }
    });

    if (projectEmptyState) {
        projectEmptyState.classList.toggle("is-visible", visibleCount === 0);
    }
}

function clearTimeFilterAutoCloseTimer() {
    if (timeFilterAutoCloseTimer) {
        window.clearTimeout(timeFilterAutoCloseTimer);
        timeFilterAutoCloseTimer = null;
    }
}

function clearTimeFilterCloseTimer() {
    if (timeFilterCloseTimer) {
        window.clearTimeout(timeFilterCloseTimer);
        timeFilterCloseTimer = null;
    }
}

function scheduleTimeFilterAutoClose() {
    if (!timeFilterPanel || !timeFilterToggle || !timeFilterPanel.classList.contains("is-open")) {
        return;
    }

    clearTimeFilterAutoCloseTimer();
    timeFilterAutoCloseTimer = window.setTimeout(function () {
        if (!timeFilterPanel.matches(":hover") && !timeFilterToggle.matches(":hover")) {
            setTimeFilterPanelOpen(false);
        }
    }, 1500);
}

function setTimeFilterPanelOpen(isOpen, options) {
    if (!timeFilterPanel || !timeFilterToggle) {
        return;
    }

    const closeInstantly = !!(options && options.closeInstantly);
    clearTimeFilterAutoCloseTimer();
    clearTimeFilterCloseTimer();

    if (isOpen && typologyFilterPanel && typologyFilterPanel.classList.contains("is-open")) {
        setTypologyFilterPanelOpen(false, { closeInstantly: true });
    }

    if (isOpen) {
        timeFilterPanel.classList.remove("is-closing");
        timeFilterPanel.classList.add("is-open");
        timeFilterPanel.setAttribute("aria-hidden", "false");
    } else if (timeFilterPanel.classList.contains("is-open") || timeFilterPanel.classList.contains("is-closing")) {
        if (closeInstantly) {
            timeFilterPanel.classList.remove("is-open", "is-closing");
            timeFilterPanel.setAttribute("aria-hidden", "true");
        } else {
        timeFilterPanel.classList.remove("is-open");
        timeFilterPanel.classList.add("is-closing");
        timeFilterPanel.setAttribute("aria-hidden", "true");
        timeFilterCloseTimer = window.setTimeout(function () {
            timeFilterPanel.classList.remove("is-closing");
            timeFilterCloseTimer = null;
        }, 560);
        }
    }

    timeFilterToggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
        scheduleTimeFilterAutoClose();
    }
}

function clearTypologyFilterAutoCloseTimer() {
    if (typologyFilterAutoCloseTimer) {
        window.clearTimeout(typologyFilterAutoCloseTimer);
        typologyFilterAutoCloseTimer = null;
    }
}

function clearTypologyFilterCloseTimer() {
    if (typologyFilterCloseTimer) {
        window.clearTimeout(typologyFilterCloseTimer);
        typologyFilterCloseTimer = null;
    }
}

function scheduleTypologyFilterAutoClose() {
    if (!typologyFilterPanel || !typologyFilterToggle || !typologyFilterPanel.classList.contains("is-open")) {
        return;
    }

    clearTypologyFilterAutoCloseTimer();
    typologyFilterAutoCloseTimer = window.setTimeout(function () {
        if (!typologyFilterPanel.matches(":hover") && !typologyFilterToggle.matches(":hover")) {
            setTypologyFilterPanelOpen(false);
        }
    }, 1500);
}

function setTypologyFilterPanelOpen(isOpen, options) {
    if (!typologyFilterPanel || !typologyFilterToggle) {
        return;
    }

    const closeInstantly = !!(options && options.closeInstantly);
    clearTypologyFilterAutoCloseTimer();
    clearTypologyFilterCloseTimer();

    if (isOpen && timeFilterPanel && timeFilterPanel.classList.contains("is-open")) {
        setTimeFilterPanelOpen(false, { closeInstantly: true });
    }

    if (isOpen) {
        typologyFilterPanel.classList.remove("is-closing");
        typologyFilterPanel.classList.add("is-open");
        typologyFilterPanel.setAttribute("aria-hidden", "false");
    } else if (typologyFilterPanel.classList.contains("is-open") || typologyFilterPanel.classList.contains("is-closing")) {
        if (closeInstantly) {
            typologyFilterPanel.classList.remove("is-open", "is-closing");
            typologyFilterPanel.setAttribute("aria-hidden", "true");
        } else {
        typologyFilterPanel.classList.remove("is-open");
        typologyFilterPanel.classList.add("is-closing");
        typologyFilterPanel.setAttribute("aria-hidden", "true");
        typologyFilterCloseTimer = window.setTimeout(function () {
            typologyFilterPanel.classList.remove("is-closing");
            typologyFilterCloseTimer = null;
        }, 560);
        }
    }

    typologyFilterToggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
        scheduleTypologyFilterAutoClose();
    }
}

function syncFilterPanelOffsets() {
    [
        [timeFilterToggle, timeFilterPanel],
        [typologyFilterToggle, typologyFilterPanel]
    ].forEach(function (entry) {
        const toggle = entry[0];
        const panel = entry[1];

        if (!toggle || !panel || !panel.parentElement) {
            return;
        }

        const panelParentRect = panel.parentElement.getBoundingClientRect();
        const toggleRect = toggle.getBoundingClientRect();
        const offset = Math.max(toggleRect.left - panelParentRect.left, 0);
        panel.style.setProperty("--filter-panel-offset", offset.toFixed(1) + "px");
    });
}

function setActiveTimeFilter(value) {
    activeYearFilter = value || "all";

    timeFilterOptions.forEach(function (item) {
        const itemValue = item.dataset.yearFilter || "all";
        item.classList.toggle("is-active", itemValue === activeYearFilter);
    });
}

function setActiveTypologyFilter(value) {
    activeTypologyFilter = value || "all";

    typologyFilterOptions.forEach(function (item) {
        const itemValue = item.dataset.typologyFilter || "all";
        item.classList.toggle("is-active", itemValue === activeTypologyFilter);
    });
}

function resetSecondaryProjectFilters() {
    setActiveTimeFilter("all");
    setActiveTypologyFilter("all");
    setTimeFilterPanelOpen(false);
    setTypologyFilterPanelOpen(false);
}

function appendProjectListInfo(card, detail) {
    const listInfo = document.createElement("div");
    listInfo.className = "project-list-info";

    [
        ["project-list-title", detail.title],
        ["project-list-category", detail.category],
        ["project-list-typology", detail.typology],
        ["project-list-year", detail.year]
    ].forEach(function (entry) {
        const line = document.createElement("p");
        line.className = entry[0];
        line.textContent = entry[1] || "";
        listInfo.appendChild(line);
    });

    card.appendChild(listInfo);
}

export function initProjectGrid() {
    if (projectGrid) {
        const cardFragment = document.createDocumentFragment();

        projectDetails.forEach(function (detail, index) {
            cardFragment.appendChild(createProjectCard(detail, index));
        });

        projectGrid.appendChild(cardFragment);
        projectCards = Array.prototype.slice.call(projectGrid.querySelectorAll(".project-card"));
    }

    projectCards.forEach(function (card, index) {
        const detail = projectDetails[index];
        setupProjectCardImage(card, detail && detail.cardImage);
        card.style.setProperty("--card-index", index);
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        appendProjectListInfo(card, detail || {});
        card.addEventListener("click", function () {
            openProjectDetail(index, card);
        });
        card.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openProjectDetail(index, card);
            }
        });
    });

    if (projectGrid) {
        projectEmptyState = document.createElement("p");
        projectEmptyState.className = "project-empty-state";
        projectEmptyState.textContent = "More works are continuously being updated. Please check back soon.";
        projectGrid.insertAdjacentElement("afterend", projectEmptyState);
    }
    categoryLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            const filter = link.dataset.filter;

            categoryLinks.forEach(function (item) {
                item.classList.remove("is-active");
            });

            link.classList.add("is-active");
            activeCategoryFilter = filter;

            if (filter === "all") {
                resetSecondaryProjectFilters();
            }

            applyProjectFilters();
        });
    });

    if (timeFilterToggle && timeFilterPanel) {
        timeFilterToggle.addEventListener("click", function () {
            const willOpen = !timeFilterPanel.classList.contains("is-open");
            setTimeFilterPanelOpen(willOpen, { closeInstantly: !willOpen });
        });

        timeFilterToggle.addEventListener("mouseenter", clearTimeFilterAutoCloseTimer);
        timeFilterToggle.addEventListener("mouseleave", scheduleTimeFilterAutoClose);
        timeFilterPanel.addEventListener("mouseenter", clearTimeFilterAutoCloseTimer);
        timeFilterPanel.addEventListener("mouseleave", scheduleTimeFilterAutoClose);
    }

    if (typologyFilterToggle && typologyFilterPanel) {
        typologyFilterToggle.addEventListener("click", function () {
            const willOpen = !typologyFilterPanel.classList.contains("is-open");
            setTypologyFilterPanelOpen(willOpen, { closeInstantly: !willOpen });
        });

        typologyFilterToggle.addEventListener("mouseenter", clearTypologyFilterAutoCloseTimer);
        typologyFilterToggle.addEventListener("mouseleave", scheduleTypologyFilterAutoClose);
        typologyFilterPanel.addEventListener("mouseenter", clearTypologyFilterAutoCloseTimer);
        typologyFilterPanel.addEventListener("mouseleave", scheduleTypologyFilterAutoClose);
    }

    timeFilterOptions.forEach(function (option) {
        option.addEventListener("click", function () {
            setActiveTimeFilter(option.dataset.yearFilter || "all");
            applyProjectFilters();
            scheduleTimeFilterAutoClose();
        });
    });

    typologyFilterOptions.forEach(function (option) {
        option.addEventListener("click", function () {
            setActiveTypologyFilter(option.dataset.typologyFilter || "all");
            applyProjectFilters();
            scheduleTypologyFilterAutoClose();
        });
    });

    document.addEventListener("click", function (event) {
        if (!timeFilterPanel || !timeFilterToggle) {
            if (typologyFilterPanel && typologyFilterToggle && !typologyFilterPanel.contains(event.target) && !typologyFilterToggle.contains(event.target)) {
                setTypologyFilterPanelOpen(false);
            }

            return;
        }

        if (timeFilterPanel.contains(event.target) || timeFilterToggle.contains(event.target)) {
            if (typologyFilterPanel && typologyFilterToggle && !typologyFilterPanel.contains(event.target) && !typologyFilterToggle.contains(event.target)) {
                setTypologyFilterPanelOpen(false);
            }

            return;
        }

        setTimeFilterPanelOpen(false);

        if (typologyFilterPanel && typologyFilterToggle && !typologyFilterPanel.contains(event.target) && !typologyFilterToggle.contains(event.target)) {
            setTypologyFilterPanelOpen(false);
        }
    });

    if (viewToggle && projectGrid) {
        viewToggle.addEventListener("click", function () {
            const isListView = projectGrid.classList.toggle("is-list-view");
            projectGrid.classList.remove("is-switching-to-grid", "is-switching-to-list");
            void projectGrid.offsetWidth;
            projectGrid.classList.add(isListView ? "is-switching-to-list" : "is-switching-to-grid");
            viewToggle.classList.toggle("is-active", isListView);
            viewToggle.setAttribute("aria-pressed", String(isListView));
            viewToggle.setAttribute("aria-label", isListView ? "Switch to grid view" : "Switch to list view");

            window.setTimeout(function () {
                projectGrid.classList.remove("is-switching-to-grid", "is-switching-to-list");
            }, 2050);
        });
    }
    syncFilterPanelOffsets();
    window.addEventListener("resize", syncFilterPanelOffsets);
}
