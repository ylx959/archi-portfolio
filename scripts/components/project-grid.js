import { gsap } from "../core/animation.js";
import { openProjectDetail } from "./project-detail.js";
import { projectDetails } from "../core/project-data.js";
import { getPreviewImageSrc } from "../core/utils.js";

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

// One controller per filter panel, filled in by initProjectGrid().
const filterPanels = [];

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

// The time and typology panels behave identically, so there is one
// implementation and two instances of it. This used to be two copies of the same
// sixty lines that differed only in an identifier prefix — including two copies
// of the closing animation's timing, which is exactly the kind of thing that
// drifts apart unnoticed.
function createFilterPanel(toggle, panel) {
    if (!toggle || !panel) {
        return null;
    }

    const controller = { toggle: toggle, panel: panel, autoClose: null, close: null };

    function cancel(key) {
        if (controller[key]) {
            controller[key].kill();
            controller[key] = null;
        }
    }

    // Leaving the panel closes it, but not at once: the pointer often slips off
    // and back on its way down to an option.
    function scheduleAutoClose() {
        cancel("autoClose");

        if (!panel.classList.contains("is-open")) {
            return;
        }

        controller.autoClose = gsap.delayedCall(1.5, function () {
            controller.autoClose = null;

            if (!panel.matches(":hover") && !toggle.matches(":hover")) {
                controller.setOpen(false);
            }
        });
    }

    controller.scheduleAutoClose = scheduleAutoClose;

    controller.contains = function (node) {
        return panel.contains(node) || toggle.contains(node);
    };

    controller.setOpen = function (isOpen, options) {
        cancel("autoClose");
        cancel("close");

        if (isOpen) {
            // Only one panel is ever open. The one being replaced skips its
            // closing animation so the two do not cross-fade over each other.
            filterPanels.forEach(function (other) {
                if (other !== controller) {
                    other.setOpen(false, { closeInstantly: true });
                }
            });

            panel.classList.remove("is-closing");
            panel.classList.add("is-open");
            panel.setAttribute("aria-hidden", "false");
            scheduleAutoClose();
        } else if (panel.classList.contains("is-open") || panel.classList.contains("is-closing")) {
            panel.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");

            if (options && options.closeInstantly) {
                panel.classList.remove("is-closing");
            } else {
                // `is-closing` drives the option stagger on the way out; it has
                // to outlive `is-open` for as long as that animation runs.
                panel.classList.add("is-closing");
                controller.close = gsap.delayedCall(0.56, function () {
                    controller.close = null;
                    panel.classList.remove("is-closing");
                });
            }
        }

        toggle.setAttribute("aria-expanded", String(isOpen));
    };

    toggle.addEventListener("click", function () {
        const willOpen = !panel.classList.contains("is-open");
        controller.setOpen(willOpen, { closeInstantly: !willOpen });
    });

    [toggle, panel].forEach(function (element) {
        element.addEventListener("mouseenter", function () {
            cancel("autoClose");
        });
        element.addEventListener("mouseleave", scheduleAutoClose);
    });

    filterPanels.push(controller);
    return controller;
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
    filterPanels.forEach(function (controller) {
        controller.setOpen(false);
    });
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

    const timeFilter = createFilterPanel(timeFilterToggle, timeFilterPanel);
    const typologyFilter = createFilterPanel(typologyFilterToggle, typologyFilterPanel);

    timeFilterOptions.forEach(function (option) {
        option.addEventListener("click", function () {
            setActiveTimeFilter(option.dataset.yearFilter || "all");
            applyProjectFilters();

            if (timeFilter) {
                timeFilter.scheduleAutoClose();
            }
        });
    });

    typologyFilterOptions.forEach(function (option) {
        option.addEventListener("click", function () {
            setActiveTypologyFilter(option.dataset.typologyFilter || "all");
            applyProjectFilters();

            if (typologyFilter) {
                typologyFilter.scheduleAutoClose();
            }
        });
    });

    // A click lands outside every panel it is not inside of.
    document.addEventListener("click", function (event) {
        filterPanels.forEach(function (controller) {
            if (!controller.contains(event.target)) {
                controller.setOpen(false);
            }
        });
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
