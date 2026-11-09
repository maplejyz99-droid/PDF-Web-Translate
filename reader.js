import { translateSelection } from "./deepseek.js";
import { parseArxivPdfUrl } from "./pdf-source.js";

const viewer = document.querySelector("#viewer");
const viewerContainer = document.querySelector("#viewerContainer");
const toolbar = document.querySelector("#toolbarContainer");
const trigger = document.querySelector("#pdfsel-trigger");
const panel = document.querySelector("#pdfsel-panel");
const result = document.querySelector("#pdfsel-result");
const closeButton = document.querySelector("#pdfsel-close");
const nativeButton = document.querySelector("#pdfsel-native");
const emptyState = document.querySelector("#pdfsel-empty");
const loadMessage = document.querySelector("#pdfsel-load-message");

let selecting = false;
let pendingFrame = 0;
let pickedSelection = null;
let activeRequest = null;

function isPdfText(node) {
  const element = node instanceof Element ? node : node?.parentElement;
  const layer = element?.closest(".textLayer");
  return layer && viewer.contains(layer);
}

function readSelection() {
  const selection = document.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  if (!isPdfText(selection.anchorNode) || !isPdfText(selection.focusNode)) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const range = selection.getRangeAt(0);
  const backward = selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset;
  const viewport = viewerContainer.getBoundingClientRect();
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0 &&
      rect.bottom > viewport.top && rect.top < viewport.bottom &&
      rect.right > viewport.left && rect.left < viewport.right,
  );
  const anchor = backward ? rects[0] : rects.at(-1);
  return anchor ? { text, anchor } : null;
}

function placeNearSelection(element, anchor) {
  const gap = 8;
  const minTop = Math.max(gap, toolbar.getBoundingClientRect().bottom + gap);
  const maxTop = Math.max(minTop, innerHeight - element.offsetHeight - gap);
  const below = anchor.bottom + gap;
  const top = below <= maxTop ? below : anchor.top - element.offsetHeight - gap;
  const left = Math.max(gap, Math.min(anchor.left, innerWidth - element.offsetWidth - gap));
  element.style.top = `${Math.max(minTop, Math.min(top, maxTop))}px`;
  element.style.left = `${left}px`;
}

function dismiss() {
  if (pendingFrame) {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
  }
  activeRequest?.abort();
  activeRequest = null;
  pickedSelection = null;
  trigger.hidden = true;
  panel.hidden = true;
  result.textContent = "";
}

function queueSelectionRefresh() {
  if (selecting || !panel.hidden || pendingFrame) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = 0;
    if (selecting || !panel.hidden) return;

    pickedSelection = readSelection();
    trigger.hidden = !pickedSelection;
    if (pickedSelection) placeNearSelection(trigger, pickedSelection.anchor);
  });
}

async function translatePickedSelection() {
  if (!panel.hidden) return;
  const selection = pickedSelection ?? readSelection();
  if (!selection) return;

  const request = new AbortController();
  activeRequest = request;
  trigger.hidden = true;
  panel.hidden = false;
  result.textContent = "正在翻译…";
  result.scrollTop = 0;
  placeNearSelection(panel, selection.anchor);
  closeButton.focus({ preventScroll: true });

  try {
    const translation = await translateSelection(selection.text, request.signal);
    if (activeRequest === request) result.textContent = translation;
  } catch (error) {
    if (activeRequest === request) {
      result.textContent = error instanceof Error ? error.message : "翻译失败。请重试。";
    }
  } finally {
    if (activeRequest === request) {
      activeRequest = null;
      placeNearSelection(panel, selection.anchor);
    }
  }
}

document.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || trigger.contains(event.target) || panel.contains(event.target)) return;
  selecting = viewer.contains(event.target);
  dismiss();
}, true);

document.addEventListener("pointerup", () => {
  if (!selecting) return;
  selecting = false;
  queueSelectionRefresh();
}, true);

document.addEventListener("pointercancel", () => {
  selecting = false;
}, true);

window.addEventListener("blur", () => {
  selecting = false;
});
document.addEventListener("selectionchange", queueSelectionRefresh);
viewerContainer.addEventListener("scroll", dismiss, { passive: true });
window.addEventListener("resize", dismiss);

trigger.addEventListener("pointerdown", (event) => event.preventDefault());
trigger.addEventListener("click", () => void translatePickedSelection());

function closeTranslation() {
  dismiss();
  viewerContainer.focus({ preventScroll: true });
}

closeButton.addEventListener("click", closeTranslation);
document.addEventListener("keydown", (event) => {
  // PDF.js uses the browser's Save shortcut to download the PDF.
  if (
    event.metaKey !== event.ctrlKey && !event.altKey && !event.shiftKey &&
    event.key.toLowerCase() === "s"
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  if (event.key === "Escape" && (!panel.hidden || !trigger.hidden)) {
    event.preventDefault();
    event.stopPropagation();
    closeTranslation();
    return;
  }
  if (
    event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey &&
    event.code === "KeyT" && !event.repeat && panel.hidden && readSelection()
  ) {
    event.preventDefault();
    void translatePickedSelection();
  }
}, true);

document.querySelector("#pdfsel-settings").addEventListener("click", () => {
  dismiss();
  void chrome.runtime.openOptionsPage();
});

document.querySelector("#pdfsel-open-file").addEventListener("click", () => {
  document.querySelector("#fileInput")?.click();
});

function enableEditorHoverMenus(eventBus) {
  if (!matchMedia("(hover: hover)").matches) return;

  for (const menu of toolbar.querySelectorAll(".toolbarButtonWithContainer > .editorParamsToolbar.doorHangerRight")) {
    const tool = menu.parentElement;
    const button = tool.querySelector(":scope > .toolbarButton");
    const requiresActiveTool = menu.classList.contains("menu");
    let hovered = false;
    let keyboardFocus = false;
    let touch = false;
    let hideTimer;

    function updateMenu() {
      const active = button.classList.contains("toggled");
      const wantsMenu = touch ? active : hovered || keyboardFocus;
      const open = !button.disabled && wantsMenu && (active || !requiresActiveTool);
      button.setAttribute("aria-pressed", active);
      button.setAttribute("aria-expanded", open);
      menu.classList.toggle("hidden", !open);
    }

    tool.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      clearTimeout(hideTimer);
      touch = false;
      hovered = true;
      updateMenu();
    });
    tool.addEventListener("pointerleave", () => {
      clearTimeout(hideTimer);
      // Give the pointer time to cross the gap between the button and menu.
      hideTimer = setTimeout(() => {
        hovered = false;
        updateMenu();
      }, 140);
    });
    tool.addEventListener("pointerdown", (event) => {
      touch = event.pointerType === "touch";
      keyboardFocus = false;
    }, true);

    button.addEventListener("focus", () => {
      keyboardFocus = button.matches(":focus-visible");
      if (keyboardFocus) touch = false;
      updateMenu();
    });
    tool.addEventListener("focusout", (event) => {
      if (tool.contains(event.relatedTarget)) return;
      keyboardFocus = false;
      updateMenu();
    });
    tool.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || menu.classList.contains("hidden")) return;
      event.preventDefault();
      event.stopPropagation();
      button.focus({ preventScroll: true });
      hovered = false;
      keyboardFocus = false;
      touch = false;
      updateMenu();
    });

    // PDF.js updates the selected tool first. Keep its menu state independent.
    eventBus.on("annotationeditormodechanged", updateMenu);
    updateMenu();
  }
}

function showLoadMessage(message) {
  loadMessage.textContent = message;
  emptyState.hidden = false;
}

async function openInNativeReader() {
  try {
    await chrome.mimeHandler.abortAndFallbackToNativeHandler();
  } catch {
    showLoadMessage("无法切换阅读器。你可以在扩展设置中关闭 PDF 接管，再重新打开链接。");
  }
}

nativeButton.addEventListener("click", () => void openInNativeReader());

async function openDocument(application) {
  const params = new URL(location.href).searchParams;
  const source = parseArxivPdfUrl(params.get("source"));
  if (source) {
    try {
      application.initialBookmark = source.hash.slice(1);
      await application.open({ url: source.href });
    } catch {
      showLoadMessage("无法读取这份 arXiv PDF。请重新打开链接，或选择已下载的 PDF。");
    }
    return;
  }

  let stream;
  try {
    stream = await chrome.mimeHandler?.getStreamInfo();
  } catch {
    // Opening the viewer directly is also the entry point for a local file.
  }
  if (!stream) {
    showLoadMessage("选择一份 PDF，然后划选正文里的文字。");
    return;
  }

  nativeButton.hidden = false;
  try {
    const response = await fetch(stream.streamUrl);
    if (!response.ok) throw new Error("PDF stream unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const originalUrl = URL.parse(stream.originalUrl);
    if (originalUrl) {
      application.initialBookmark = originalUrl.hash.slice(1);
      application.setTitleUsingUrl(originalUrl.href);
    }
    await application.open({ data: bytes });
  } catch {
    await openInNativeReader();
  }
}

document.addEventListener("webviewerloaded", () => {
  const application = window.PDFViewerApplication;
  window.PDFViewerApplicationOptions.set("defaultUrl", "");
  window.PDFViewerApplicationOptions.set("enableScripting", false);
  void application.initializedPromise.then(() => {
    enableEditorHoverMenus(application.eventBus);
    application.eventBus.on("pagesinit", () => {
      emptyState.hidden = true;
      dismiss();
    });
    return openDocument(application);
  });
}, { once: true });
