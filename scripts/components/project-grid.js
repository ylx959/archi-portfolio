import { openProjectDetail } from "./project-detail.js?v=57";
import { projectDetails } from "../core/project-data.js?v=57";
import { formatCategory } from "../core/utils.js?v=57";

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

export const projectCards = document.querySelectorAll(".project-card");

let activeCategoryFilter = "all";

let activeYearFilter = "all";

let activeTypologyFilter = "all";

let timeFilterAutoCloseTimer = null;

let typologyFilterAutoCloseTimer = null;

let timeFilterCloseTimer = null;

let typologyFilterCloseTimer = null;

let projectEmptyState = null;

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

export function initProjectGrid() {
    projectCards.forEach(function (card, index) {
        const detail = projectDetails[index];
        card.style.setProperty("--card-index", index);
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        const title = card.querySelector(".project-caption h2");
        const location = card.querySelector(".project-caption p");
        const listInfo = document.createElement("div");
        listInfo.className = "project-list-info";
        listInfo.innerHTML =
            '<p class="project-list-title">' + (detail ? detail.title : (title ? title.textContent : "")) + "</p>" +
            '<p class="project-list-category">' + (detail ? detail.category : formatCategory(card.dataset.category)) + "</p>" +
            '<p class="project-list-typology">' + (detail ? detail.typology : (location ? location.textContent : "")) + "</p>" +
            '<p class="project-list-year">' + (detail ? detail.year : (card.dataset.year || "")) + "</p>";
        card.appendChild(listInfo);
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
