import { projectImageBatchSize } from "../core/constants.js?v=47";
import { body } from "../core/dom.js?v=47";
import { projectDetails } from "../core/project-data.js?v=47";
import { cancelInertiaScroll, syncInertiaScrollPosition } from "../core/scroll.js?v=47";
import { escapeAttribute, isMobileHeroMode, setButtonText, triggerOneShotButtonScroll } from "../core/utils.js?v=47";

const projectDetailOverlay = document.getElementById("projectDetailOverlay");

const projectDetailClose = document.getElementById("projectDetailClose");

const projectDetailGalleryToggle = document.getElementById("projectDetailGalleryToggle");

const projectDetailReadmore = document.getElementById("projectDetailReadmore");

const projectDetailShell = document.querySelector(".project-detail-shell");

const projectDetailTitle = document.getElementById("projectDetailTitle");

const projectDetailLocation = document.getElementById("projectDetailLocation");

const projectDetailCategory = document.getElementById("projectDetailCategory");

const projectDetailYear = document.getElementById("projectDetailYear");

const projectDetailDescription = document.getElementById("projectDetailDescription");

const projectDetailFullDescription = document.getElementById("projectDetailFullDescription");

const projectDetailGallery = document.getElementById("projectDetailGallery");

const projectDetailGalleryMode = document.getElementById("projectDetailGalleryMode");

const projectDetailStageTrack = document.getElementById("projectDetailStageTrack");

const projectDetailPrevImage = document.getElementById("projectDetailPrevImage");

const projectDetailNextImage = document.getElementById("projectDetailNextImage");

let lastFocusedProjectCard = null;

let projectDetailCloseTimer = null;

let currentProjectDetailIndex = -1;

let currentProjectDetailImages = [];

let currentProjectDetailRenderedCount = 0;

let currentProjectDetailTargetCount = 0;

let currentProjectGalleryImages = [];

let currentProjectGalleryImageIndex = 0;

let currentProjectGalleryStageIndex = 0;

function buildFullDescription(detail) {
    if (!detail) {
        return "";
    }

    if (detail.fullDescription) {
        return detail.fullDescription;
    }

    return detail.title + " is developed as a long-form " + detail.category.toLowerCase() + " proposal rooted in atmosphere, spatial sequence, and material restraint. Set in " + detail.location + ", the work begins with a close reading of movement, pause, and the emotional rhythm produced between enclosure and openness. Rather than treating form as a singular object, the project is organized as a series of linked moments, where threshold, proportion, light, and visual compression gradually shape the experience of the whole. The intention is to create a setting that feels measured and quiet, but still carries strong emotional depth through contrast, texture, and pacing. " +
        "Across the proposal, surfaces are edited carefully so that each junction, opening, and transition contributes to a more continuous architectural narrative. Light is not only used to illuminate the space, but also to structure attention, soften boundaries, and clarify the hierarchy between public and intimate zones. Material choices are imagined as part of the same composition, allowing weight, reflection, shadow, and tactile presence to work together instead of competing for emphasis. " +
        "The result is a project that values calm over spectacle and precision over excess. It aims to feel immersive without becoming heavy, and expressive without losing discipline. In this way, " + detail.title + " becomes less a static formal statement and more a carefully paced environment, where each movement reveals another layer of spatial character, visual stillness, and lived atmosphere over time.";
}

function getPreviewImageSrc(imageSrc) {
    return String(imageSrc || "")
        .split("?")[0]
        .replace("../assets/images/", "../assets/images/previews/")
        .replace(/\.[^/.]+$/, ".jpg") + "?v=2";
}

function getPreviewImageStyle(imageSrc) {
    const previewSrc = encodeURI(getPreviewImageSrc(imageSrc)).replace(/'/g, "%27");
    return "--preview-image: url('" + previewSrc + "');";
}

function markProgressiveImageLoaded(image) {
    const wrapper = image.closest(".project-detail-gallery-item, .project-detail-gallery-stage-slide");

    if (wrapper) {
        wrapper.classList.add("is-loaded");
    }
}

function setupProgressiveImage(image) {
    if (!image) {
        return;
    }

    if (image.complete && image.naturalWidth > 0) {
        markProgressiveImageLoaded(image);
        return;
    }

    image.addEventListener("load", function () {
        markProgressiveImageLoaded(image);
    }, { once: true });
}

function appendProjectDetailImage(imageIndex) {
    const detail = projectDetails[currentProjectDetailIndex];
    const imageSrc = currentProjectDetailImages[imageIndex];
    const figure = document.createElement("figure");
    const image = document.createElement("img");

    figure.className = "project-detail-gallery-item";
    figure.setAttribute("style", getPreviewImageStyle(imageSrc) + " transition-delay:" + ((imageIndex % projectImageBatchSize) * 28) + "ms");
    image.className = "project-detail-gallery-image";
    image.src = imageSrc;
    image.alt = (detail ? detail.title : "Project") + " image " + (imageIndex + 1);
    // Images are appended in batches ahead of the scroll position, so let the
    // browser decide what actually needs fetching rather than pulling the whole
    // batch down at once.
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    image.addEventListener("click", blockProjectDetailImageNavigation);
    figure.appendChild(image);
    projectDetailGallery.appendChild(figure);
    setupProgressiveImage(image);

    image.addEventListener("error", function () {
        markProgressiveImageLoaded(image);
    }, { once: true });
}

function appendNextProjectDetailImages() {
    if (!projectDetailGallery) {
        return;
    }

    while (
        currentProjectDetailRenderedCount < currentProjectDetailTargetCount &&
        currentProjectDetailRenderedCount < currentProjectDetailImages.length
    ) {
        appendProjectDetailImage(currentProjectDetailRenderedCount);
        currentProjectDetailRenderedCount += 1;
    }
}

function requestProjectDetailImages(targetCount) {
    const nextTargetCount = Math.min(targetCount, currentProjectDetailImages.length);

    if (nextTargetCount <= currentProjectDetailTargetCount) {
        return;
    }

    currentProjectDetailTargetCount = nextTargetCount;
    appendNextProjectDetailImages();
}

function loadMoreProjectDetailImages() {
    requestProjectDetailImages(currentProjectDetailTargetCount + projectImageBatchSize);
}

function maybeLoadMoreProjectDetailImages() {
    if (!projectDetailGallery || currentProjectDetailTargetCount >= currentProjectDetailImages.length) {
        return;
    }

    const scrollContainer = isMobileHeroMode() && projectDetailShell
        ? projectDetailShell
        : projectDetailGallery;
    const remainingScroll = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;

    if (remainingScroll < 900) {
        loadMoreProjectDetailImages();
    }
}

function setProjectDetailExpanded(isExpanded) {
    if (!projectDetailReadmore || !projectDetailFullDescription) {
        return;
    }

    const copy = projectDetailReadmore.closest(".project-detail-copy");

    if (copy) {
        copy.classList.toggle("is-expanded", isExpanded);
    }

    projectDetailReadmore.setAttribute("aria-expanded", String(isExpanded));
    setButtonText(projectDetailReadmore, isExpanded ? "Read -" : "Read +", ".project-detail-readmore-text", "project-detail-readmore-text");
}

// Keep a small window of slides around the current one loaded. A long gallery
// is tens of megabytes; fetching all of it the moment gallery mode opens is what
// made this feel broken on a real connection.
const galleryStagePreloadRadius = 2;

function syncProjectGalleryStageLoading() {
    if (!projectDetailStageTrack) {
        return;
    }

    const slides = Array.from(projectDetailStageTrack.querySelectorAll(".project-detail-gallery-stage-image"));

    if (!slides.length) {
        return;
    }

    // stage index 0 is the trailing clone, so the live slide sits one further in
    const activeSlideIndex = currentProjectGalleryImages.length > 1
        ? currentProjectGalleryStageIndex + 1
        : currentProjectGalleryStageIndex;

    slides.forEach(function (image, slideIndex) {
        const deferredSrc = image.getAttribute("data-src");

        if (!deferredSrc || image.getAttribute("src") === deferredSrc) {
            return;
        }

        if (Math.abs(slideIndex - activeSlideIndex) > galleryStagePreloadRadius) {
            return;
        }

        image.setAttribute("src", deferredSrc);
    });
}

function renderProjectGalleryMode() {
    if (!projectDetailStageTrack) {
        return;
    }

    if (!currentProjectGalleryImages.length) {
        projectDetailStageTrack.innerHTML = "";
        return;
    }

    const stageImages = currentProjectGalleryImages.length > 1
        ? [currentProjectGalleryImages[currentProjectGalleryImages.length - 1]].concat(currentProjectGalleryImages, currentProjectGalleryImages[0])
        : currentProjectGalleryImages.slice();

    const existingStageImages = Array.from(projectDetailStageTrack.querySelectorAll(".project-detail-gallery-stage-image"));
    const stageImagesChanged = existingStageImages.length !== stageImages.length || existingStageImages.some(function (image, imageIndex) {
        return image.getAttribute("data-src") !== stageImages[imageIndex];
    });

    if (stageImagesChanged) {
        projectDetailStageTrack.innerHTML = stageImages.map(function (imageSrc, imageIndex) {
            const isClone = currentProjectGalleryImages.length > 1 && (imageIndex === 0 || imageIndex === stageImages.length - 1);
            const realImageIndex = currentProjectGalleryImages.length > 1
                ? (imageIndex === 0 ? currentProjectGalleryImages.length - 1 : (imageIndex === stageImages.length - 1 ? 0 : imageIndex - 1))
                : imageIndex;
            const altText = isClone ? "" : (projectDetailTitle ? projectDetailTitle.textContent + " gallery image " + (realImageIndex + 1) : "");
            const hiddenAttribute = isClone ? ' aria-hidden="true"' : "";
            // The real src is held back in data-src and assigned by
            // syncProjectGalleryStageLoading(); native loading="lazy" cannot help
            // here because the track moves by transform, so a slide's layout box
            // never actually leaves the viewport.
            return '<div class="project-detail-gallery-stage-slide"' + hiddenAttribute + ' style="' + escapeAttribute(getPreviewImageStyle(imageSrc)) + '"><img class="project-detail-gallery-stage-image" data-src="' + escapeAttribute(imageSrc) + '" alt="' + escapeAttribute(altText) + '" decoding="async" draggable="false"></div>';
        }).join("");
        projectDetailStageTrack.querySelectorAll(".project-detail-gallery-stage-image").forEach(function (image) {
            setupProgressiveImage(image);
            image.addEventListener("click", blockProjectDetailImageNavigation);
            if (image.complete && image.naturalWidth > 0) {
                applyProjectGalleryStageImageRatio(image);
                return;
            }

            image.addEventListener("load", function () {
                applyProjectGalleryStageImageRatio(image);
                renderProjectGalleryMode();
            }, { once: true });
        });
    }

    syncProjectGalleryStageLoading();

    const images = Array.from(projectDetailStageTrack.querySelectorAll(".project-detail-gallery-stage-image"));
    const viewport = projectDetailStageTrack.parentElement;

    if (!images.length || !viewport) {
        return;
    }

    images.forEach(applyProjectGalleryStageImageRatio);

    const activeStageIndex = currentProjectGalleryImages.length > 1 ? currentProjectGalleryStageIndex + 1 : currentProjectGalleryStageIndex;
    const slides = Array.from(projectDetailStageTrack.querySelectorAll(".project-detail-gallery-stage-slide"));
    const activeSlide = slides[activeStageIndex] || slides[0];
    const activeImageCenter = activeSlide.offsetLeft + (activeSlide.getBoundingClientRect().width / 2);
    const viewportCenter = viewport.getBoundingClientRect().width / 2;
    const translateX = (viewportCenter - activeImageCenter);

    projectDetailStageTrack.style.transform = "translateX(" + translateX + "px)";
}

function setProjectGalleryImage(index) {
    if (!currentProjectGalleryImages.length) {
        return;
    }

    const lastIndex = currentProjectGalleryImages.length - 1;
    currentProjectGalleryStageIndex = index;
    currentProjectGalleryImageIndex = index < 0 ? lastIndex : (index > lastIndex ? 0 : index);
    renderProjectGalleryMode();
}

function shiftProjectGalleryImage(direction) {
    setProjectGalleryImage(currentProjectGalleryImageIndex + direction);
}

function settleProjectGalleryLoop() {
    if (!projectDetailStageTrack || currentProjectGalleryImages.length < 2) {
        return;
    }

    const lastIndex = currentProjectGalleryImages.length - 1;
    let settledStageIndex = currentProjectGalleryStageIndex;

    if (currentProjectGalleryStageIndex < 0) {
        settledStageIndex = lastIndex;
    } else if (currentProjectGalleryStageIndex > lastIndex) {
        settledStageIndex = 0;
    }

    if (settledStageIndex === currentProjectGalleryStageIndex) {
        return;
    }

    currentProjectGalleryStageIndex = settledStageIndex;
    projectDetailStageTrack.style.transition = "none";
    renderProjectGalleryMode();
    void projectDetailStageTrack.offsetWidth;
    projectDetailStageTrack.style.transition = "";
}

function setProjectGalleryMode(isGalleryMode) {
    if (!projectDetailShell || !projectDetailGalleryMode || !projectDetailGalleryToggle) {
        return;
    }

    if (isMobileHeroMode() && isGalleryMode) {
        return;
    }

    projectDetailShell.classList.toggle("is-gallery-mode", isGalleryMode);
    projectDetailGalleryMode.setAttribute("aria-hidden", String(!isGalleryMode));
    projectDetailGalleryToggle.classList.toggle("is-active", isGalleryMode);
    projectDetailGalleryToggle.setAttribute("aria-pressed", String(isGalleryMode));
    setButtonText(projectDetailGalleryToggle, isGalleryMode ? "Detail" : "Gallery", ".project-detail-badge-text", "project-detail-badge-text");

    if (isGalleryMode) {
        scheduleProjectGalleryModeRender();
    }
}

function applyProjectGalleryStageImageRatio(image) {
    if (!image) {
        return;
    }

    image.style.width = "";
}

function refreshProjectGalleryImageRatios() {
    if (projectDetailStageTrack) {
        projectDetailStageTrack.querySelectorAll(".project-detail-gallery-stage-image").forEach(applyProjectGalleryStageImageRatio);
    }
}

function scheduleProjectGalleryModeRender() {
    renderProjectGalleryMode();

    window.requestAnimationFrame(function () {
        renderProjectGalleryMode();

        window.requestAnimationFrame(function () {
            renderProjectGalleryMode();
        });
    });

    window.setTimeout(renderProjectGalleryMode, 360);
}

function blockProjectDetailImageNavigation(event) {
    event.preventDefault();
    event.stopPropagation();
}

export function openProjectDetail(index, sourceCard) {
    const detail = projectDetails[index];

    if (!detail || !projectDetailOverlay) {
        return;
    }

    cancelInertiaScroll();

    lastFocusedProjectCard = sourceCard || null;
    currentProjectDetailIndex = index;
    currentProjectDetailImages = detail.images.slice();
    currentProjectDetailRenderedCount = 0;
    currentProjectDetailTargetCount = 0;
    currentProjectGalleryImages = (detail.galleryImages || detail.images).slice();
    currentProjectGalleryImageIndex = 0;
    currentProjectGalleryStageIndex = 0;
    projectDetailTitle.textContent = detail.title;
    projectDetailLocation.textContent = detail.location;
    projectDetailCategory.textContent = detail.category;
    projectDetailYear.textContent = detail.year;
    projectDetailDescription.innerHTML = detail.description.map(function (paragraph) {
        return "<p>" + paragraph + "</p>";
    }).join("");
    if (projectDetailFullDescription) {
        projectDetailFullDescription.textContent = buildFullDescription(detail);
    }
    projectDetailGallery.innerHTML = "";
    requestProjectDetailImages(projectImageBatchSize);
    setProjectDetailExpanded(false);
    setProjectGalleryMode(false);
    renderProjectGalleryMode();

    if (projectDetailCloseTimer) {
        window.clearTimeout(projectDetailCloseTimer);
        projectDetailCloseTimer = null;
    }

    projectDetailOverlay.classList.remove("is-active", "is-closing");
    projectDetailOverlay.classList.add("is-visible");
    projectDetailOverlay.setAttribute("aria-hidden", "false");
    body.classList.add("is-project-detail-open");
    if (projectDetailShell) {
        projectDetailShell.scrollTop = 0;
    }
    projectDetailGallery.scrollTop = 0;

    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            projectDetailOverlay.classList.add("is-active");
            refreshProjectGalleryImageRatios();
            renderProjectGalleryMode();
        });
    });

    if (projectDetailClose) {
        window.setTimeout(function () {
            if (projectDetailOverlay.classList.contains("is-active")) {
                projectDetailClose.focus({ preventScroll: true });
            }
        }, 220);
    }
}

function closeProjectDetail() {
    if (!projectDetailOverlay) {
        return;
    }

    const lockedPageY = window.scrollY;
    cancelInertiaScroll();
    projectDetailOverlay.classList.remove("is-active");
    projectDetailOverlay.classList.add("is-closing");
    projectDetailOverlay.setAttribute("aria-hidden", "true");
    projectDetailCloseTimer = window.setTimeout(function () {
        window.scrollTo(0, lockedPageY);
        projectDetailOverlay.classList.remove("is-visible", "is-closing");
        body.classList.remove("is-project-detail-open");
        currentProjectDetailIndex = -1;
        currentProjectDetailImages = [];
        currentProjectDetailRenderedCount = 0;
        currentProjectDetailTargetCount = 0;
        currentProjectGalleryImages = [];
        currentProjectGalleryImageIndex = 0;
        currentProjectGalleryStageIndex = 0;
        setProjectGalleryMode(false);
        setProjectDetailExpanded(false);
        projectDetailCloseTimer = null;

        if (lastFocusedProjectCard) {
            lastFocusedProjectCard.focus({ preventScroll: true });
            window.scrollTo(0, lockedPageY);
        }

        syncInertiaScrollPosition();
    }, 240);
}

function preloadProjectDetailImages() {
    const uniqueImages = Array.from(new Set(projectDetails.flatMap(function (detail) {
        return detail.images.slice(0, 1);
    })));

    uniqueImages.forEach(function (imageSrc) {
        const image = new Image();
        image.decoding = "async";
        image.src = imageSrc;
    });
}

export function initProjectDetail() {
    preloadProjectDetailImages();
    if (projectDetailClose) {
        projectDetailClose.addEventListener("click", closeProjectDetail);
    }

    if (projectDetailGalleryToggle) {
        projectDetailGalleryToggle.addEventListener("click", function () {
            if (isMobileHeroMode()) {
                setProjectGalleryMode(false);
                return;
            }

            const isGalleryMode = projectDetailShell ? !projectDetailShell.classList.contains("is-gallery-mode") : false;
            triggerOneShotButtonScroll(projectDetailGalleryToggle, 500);
            setProjectGalleryMode(isGalleryMode);
        });
    }

    if (projectDetailReadmore) {
        projectDetailReadmore.addEventListener("click", function () {
            const copy = projectDetailReadmore.closest(".project-detail-copy");
            const isExpanded = copy ? !copy.classList.contains("is-expanded") : false;
            triggerOneShotButtonScroll(projectDetailReadmore, 680);
            setProjectDetailExpanded(isExpanded);
        });
    }

    if (projectDetailPrevImage) {
        projectDetailPrevImage.addEventListener("click", function () {
            shiftProjectGalleryImage(-1);
        });
        projectDetailPrevImage.addEventListener("dblclick", function (event) {
            event.preventDefault();
        });
    }

    if (projectDetailNextImage) {
        projectDetailNextImage.addEventListener("click", function () {
            shiftProjectGalleryImage(1);
        });
        projectDetailNextImage.addEventListener("dblclick", function (event) {
            event.preventDefault();
        });
    }

    if (projectDetailStageTrack) {
        projectDetailStageTrack.addEventListener("transitionend", function (event) {
            if (event.target === projectDetailStageTrack && event.propertyName === "transform") {
                settleProjectGalleryLoop();
            }
        });
    }

    if (projectDetailGallery) {
        projectDetailGallery.addEventListener("scroll", maybeLoadMoreProjectDetailImages, { passive: true });
    }

    if (projectDetailShell) {
        projectDetailShell.addEventListener("scroll", maybeLoadMoreProjectDetailImages, { passive: true });
    }
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && projectDetailOverlay && projectDetailOverlay.classList.contains("is-visible")) {
            closeProjectDetail();
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            if (projectDetailShell && projectDetailShell.classList.contains("is-gallery-mode")) {
                event.preventDefault();
                shiftProjectGalleryImage(event.key === "ArrowLeft" ? -1 : 1);
            }
        }
    });
    window.addEventListener("resize", function () {
        refreshProjectGalleryImageRatios();

        if (projectDetailShell && projectDetailShell.classList.contains("is-gallery-mode")) {
            if (isMobileHeroMode()) {
                setProjectGalleryMode(false);
            } else {
                renderProjectGalleryMode();
            }
        }
    });
}
