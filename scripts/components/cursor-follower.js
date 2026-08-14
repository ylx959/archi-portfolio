import { body } from "../core/dom.js?v=58";
import { getCurrentSection } from "../core/sections.js?v=58";
import { isEntered } from "../core/state.js?v=58";

const cursorFollower = document.getElementById("cursorFollower");

function setupCursorFollower() {
    if (!cursorFollower) {
        return;
    }

    body.appendChild(cursorFollower);

    const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const interactiveSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "textarea:not([disabled])",
        "select:not([disabled])",
        "summary",
        "[role='button']",
        "[tabindex]:not([tabindex='-1'])",
        "[data-detail-close]",
        "[data-drawings-detail-close]",
        ".project-card",
        ".drawings-card",
        ".about-frame-link"
    ].join(", ");
    const mediaSelector = [
        "img",
        "picture",
        "svg",
        "canvas",
        ".hero-visual",
        ".hero-main-image",
        ".section-floating-logo",
        ".section-floating-logo-image",
        ".project-image",
        ".drawings-image",
        ".about-card-face"
    ].join(", ");
    const textSelector = [
        "h1",
        "h2",
        "h3",
        "h4",
        "p",
        "li",
        "span",
        "label",
        ".subtitle",
        ".description-copy",
        ".nav-link",
        ".project-caption",
        ".drawings-caption",
        ".contact-chip",
        ".contact-socials a"
    ].join(", ");
    const magnifierExcludedSelector = [
        ".form",
        ".input",
        ".btn",
        "#enterForm",
        "#name",
        "#enterButton",
        ".drawings-title",
        ".drawings-title-line",
        ".drawings-title-subline",
        ".drawings-title-char"
    ].join(", ");
    let idleTimer = null;
    let cursorFrame = null;
    let isEnabled = false;
    const imageMagnifierScale = 2.25;
    let isMagnifierLockedUntilProjects = false;
    const cursorPosition = {
        x: -120,
        y: -120,
        targetX: -120,
        targetY: -120,
        hasMoved: false
    };

    function renderCursorFollower() {
        cursorFollower.style.setProperty("--cursor-x", cursorPosition.x + "px");
        cursorFollower.style.setProperty("--cursor-y", cursorPosition.y + "px");
    }

    function animateCursorFollower() {
        if (!isEnabled) {
            cursorFrame = null;
            return;
        }

        const ease = cursorFollower.classList.contains("is-interactive") ? 0.085 : 0.06;
        const deltaX = cursorPosition.targetX - cursorPosition.x;
        const deltaY = cursorPosition.targetY - cursorPosition.y;

        cursorPosition.x += deltaX * ease;
        cursorPosition.y += deltaY * ease;
        renderCursorFollower();

        if (Math.abs(deltaX) > 0.08 || Math.abs(deltaY) > 0.08) {
            cursorFrame = window.requestAnimationFrame(animateCursorFollower);
            return;
        }

        cursorPosition.x = cursorPosition.targetX;
        cursorPosition.y = cursorPosition.targetY;
        renderCursorFollower();
        cursorFrame = null;
    }

    function requestCursorAnimation() {
        if (!cursorFrame) {
            cursorFrame = window.requestAnimationFrame(animateCursorFollower);
        }
    }

    function isCursorHintAllowed() {
        const currentSection = getCurrentSection();
        return isEntered() && currentSection && currentSection.id === "home";
    }

    function setIdleTimer() {
        window.clearTimeout(idleTimer);
        cursorFollower.classList.toggle("is-idle", isCursorHintAllowed());
    }

    function getCurrentSectionId() {
        const currentSection = getCurrentSection();
        return currentSection ? currentSection.id : "";
    }

    function hasReachedProjectsSection() {
        const projectsSection = document.getElementById("projects");

        return !!(projectsSection && window.scrollY + 120 >= projectsSection.offsetTop);
    }

    function syncMagnifierLockState() {
        if (!isMagnifierLockedUntilProjects) {
            return false;
        }

        if (getCurrentSectionId() === "projects" || hasReachedProjectsSection()) {
            isMagnifierLockedUntilProjects = false;
            return false;
        }

        cursorFollower.classList.remove("is-interactive");
        clearImageMagnifier();
        return true;
    }

    function isPointInsideRect(x, y, rect, padding) {
        return x >= rect.left - padding &&
            x <= rect.right + padding &&
            y >= rect.top - padding &&
            y <= rect.bottom + padding;
    }

    function isElementVisible(element) {
        if (!element) {
            return false;
        }

        const styles = window.getComputedStyle(element);
        return styles.display !== "none" &&
            styles.visibility !== "hidden" &&
            parseFloat(styles.opacity) > 0;
    }

    function isPointOverElementBox(x, y, element) {
        if (!isElementVisible(element)) {
            return false;
        }

        return Array.from(element.getClientRects()).some(function (rect) {
            return rect.width > 0 && rect.height > 0 && isPointInsideRect(x, y, rect, 1);
        });
    }

    function isPointOverText(x, y, element) {
        if (!isElementVisible(element) || !element.textContent.trim()) {
            return false;
        }

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();

        while (textNode) {
            if (textNode.textContent.trim()) {
                const range = document.createRange();
                range.selectNodeContents(textNode);

                const isOverTextRect = Array.from(range.getClientRects()).some(function (rect) {
                    return rect.width > 0 && rect.height > 0 && isPointInsideRect(x, y, rect, 2);
                });

                range.detach();

                if (isOverTextRect) {
                    return true;
                }
            }

            textNode = walker.nextNode();
        }

        return false;
    }

    function getImageMagnifierElement(element) {
        if (!element) {
            return null;
        }

        if (element.matches(mediaSelector)) {
            return element;
        }

        return element.querySelector(mediaSelector);
    }

    function getMagnifierImageSource(element) {
        const imageElement = element instanceof HTMLImageElement
            ? element
            : element.querySelector("img");

        if (imageElement && imageElement.currentSrc) {
            return 'url("' + imageElement.currentSrc.replace(/"/g, '\\"') + '")';
        }

        const backgroundImage = window.getComputedStyle(element).backgroundImage;

        if (backgroundImage && backgroundImage !== "none" && backgroundImage.indexOf("url(") !== -1) {
            return backgroundImage;
        }

        return "";
    }

    function getObjectPositionOffset(positionValue, availableSpace, axis) {
        const normalizedPosition = positionValue || "center";

        if (normalizedPosition === "left" || normalizedPosition === "top") {
            return 0;
        }

        if (normalizedPosition === "right" || normalizedPosition === "bottom") {
            return availableSpace;
        }

        if (normalizedPosition === "center") {
            return availableSpace / 2;
        }

        if (normalizedPosition.endsWith("%")) {
            return availableSpace * (parseFloat(normalizedPosition) / 100);
        }

        if (normalizedPosition.endsWith("px")) {
            return parseFloat(normalizedPosition);
        }

        return axis === "x" ? availableSpace / 2 : availableSpace / 2;
    }

    function getObjectPositionParts(objectPosition) {
        const parts = objectPosition.trim().split(/\s+/);
        let xPosition = parts[0] || "center";
        let yPosition = parts[1] || "center";

        if (parts.length === 1 && (xPosition === "top" || xPosition === "bottom")) {
            yPosition = xPosition;
            xPosition = "center";
        }

        if (parts.length === 1 && (xPosition === "left" || xPosition === "right")) {
            yPosition = "center";
        }

        return {
            x: xPosition,
            y: yPosition
        };
    }

    function getRenderedImageMetrics(element) {
        const rect = element.getBoundingClientRect();

        if (!(element instanceof HTMLImageElement) || !element.naturalWidth || !element.naturalHeight) {
            return {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
        }

        const styles = window.getComputedStyle(element);
        const objectFit = styles.objectFit;

        if (objectFit !== "cover" && objectFit !== "contain") {
            return {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };
        }

        const scale = objectFit === "cover"
            ? Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight)
            : Math.min(rect.width / element.naturalWidth, rect.height / element.naturalHeight);
        const renderedWidth = element.naturalWidth * scale;
        const renderedHeight = element.naturalHeight * scale;
        const availableX = rect.width - renderedWidth;
        const availableY = rect.height - renderedHeight;
        const objectPosition = getObjectPositionParts(styles.objectPosition);

        return {
            left: rect.left + getObjectPositionOffset(objectPosition.x, availableX, "x"),
            top: rect.top + getObjectPositionOffset(objectPosition.y, availableY, "y"),
            width: renderedWidth,
            height: renderedHeight
        };
    }

    function clearImageMagnifier() {
        cursorFollower.classList.remove("is-image-magnifying");
        cursorFollower.style.removeProperty("--cursor-magnifier-image");
        cursorFollower.style.removeProperty("--cursor-magnifier-size");
        cursorFollower.style.removeProperty("--cursor-magnifier-position");
    }

    function updateImageMagnifier(x, y, element) {
        const imageElement = getImageMagnifierElement(element);

        if (!imageElement || !isPointOverElementBox(x, y, imageElement)) {
            clearImageMagnifier();
            return;
        }

        const imageSource = getMagnifierImageSource(imageElement);

        if (!imageSource) {
            clearImageMagnifier();
            return;
        }

        const imageMetrics = getRenderedImageMetrics(imageElement);
        const lensSize = 58;
        const lensCenter = lensSize / 2;
        const localX = x - imageMetrics.left;
        const localY = y - imageMetrics.top;
        const positionX = lensCenter - (localX * imageMagnifierScale);
        const positionY = lensCenter - (localY * imageMagnifierScale);

        cursorFollower.classList.add("is-image-magnifying");
        cursorFollower.style.setProperty("--cursor-magnifier-image", imageSource);
        cursorFollower.style.setProperty("--cursor-magnifier-size", (imageMetrics.width * imageMagnifierScale) + "px " + (imageMetrics.height * imageMagnifierScale) + "px");
        cursorFollower.style.setProperty("--cursor-magnifier-position", positionX + "px " + positionY + "px");
    }

    function getMagnifiableElementFromTarget(x, y, target) {
        if (!target || target === cursorFollower) {
            return null;
        }

        if (target.closest(magnifierExcludedSelector)) {
            return null;
        }

        const mediaElement = target.closest(mediaSelector);

        if (mediaElement && isPointOverElementBox(x, y, mediaElement)) {
            return mediaElement;
        }

        const interactiveElement = target.closest(interactiveSelector);

        if (interactiveElement && isPointOverElementBox(x, y, interactiveElement)) {
            return interactiveElement;
        }

        const textElement = target.closest(textSelector);

        if (textElement && isPointOverText(x, y, textElement)) {
            return textElement;
        }

        return null;
    }

    function getMagnifiableElement(x, y) {
        if (syncMagnifierLockState()) {
            return null;
        }

        if (getCurrentSectionId() === "home") {
            return null;
        }

        const targets = document.elementsFromPoint
            ? document.elementsFromPoint(x, y)
            : [document.elementFromPoint(x, y)];

        for (let index = 0; index < targets.length; index += 1) {
            const magnifiableElement = getMagnifiableElementFromTarget(x, y, targets[index]);

            if (magnifiableElement) {
                return magnifiableElement;
            }
        }

        return null;
    }

    function syncInteractiveState(x, y) {
        const magnifiableElement = getMagnifiableElement(x, y);
        const isInteractive = Boolean(magnifiableElement);

        cursorFollower.classList.toggle("is-interactive", isInteractive);
        if (isInteractive) {
            updateImageMagnifier(x, y, magnifiableElement);
        } else {
            clearImageMagnifier();
        }
    }

    function handlePointerMove(event) {
        if (!isEnabled || event.pointerType === "touch") {
            return;
        }

        cursorPosition.targetX = event.clientX;
        cursorPosition.targetY = event.clientY;

        if (!cursorPosition.hasMoved) {
            cursorPosition.x = event.clientX;
            cursorPosition.y = event.clientY;
            cursorPosition.hasMoved = true;
            renderCursorFollower();
        }

        cursorFollower.classList.add("is-active");
        syncInteractiveState(event.clientX, event.clientY);
        requestCursorAnimation();
        setIdleTimer();
    }

    function handleCursorScroll() {
        if (!isEnabled) {
            return;
        }

        if (syncMagnifierLockState()) {
            return;
        }

        setIdleTimer();
    }

    function handleEnteredStateChange() {
        isMagnifierLockedUntilProjects = true;
        cursorFollower.classList.remove("is-interactive");
        clearImageMagnifier();

        if (!isEnabled || !cursorPosition.hasMoved) {
            return;
        }

        setIdleTimer();
    }

    function hideCursorFollower(event) {
        if (event && event.relatedTarget) {
            return;
        }

        cursorFollower.classList.remove("is-active", "is-idle", "is-interactive");
        clearImageMagnifier();
        window.clearTimeout(idleTimer);
        if (cursorFrame) {
            window.cancelAnimationFrame(cursorFrame);
            cursorFrame = null;
        }
        cursorPosition.hasMoved = false;
    }

    function syncCursorAvailability() {
        isEnabled = finePointerQuery.matches;
        body.classList.toggle("has-custom-cursor", isEnabled);

        if (!isEnabled) {
            hideCursorFollower();
        }
    }

    syncCursorAvailability();
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerout", hideCursorFollower);
    document.addEventListener("portfolio:entered", handleEnteredStateChange);
    window.addEventListener("scroll", handleCursorScroll, { passive: true });
    window.addEventListener("wheel", handleCursorScroll, { passive: true });

    if (typeof finePointerQuery.addEventListener === "function") {
        finePointerQuery.addEventListener("change", syncCursorAvailability);
    } else if (typeof finePointerQuery.addListener === "function") {
        finePointerQuery.addListener(syncCursorAvailability);
    }
}

export function initCursorFollower() {
    setupCursorFollower();
}
