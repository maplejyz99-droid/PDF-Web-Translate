import { API_KEY_SETTING } from "./deepseek.js";
import { PDF_MIME_TYPE } from "./pdf-source.js";

const apiForm = document.querySelector("#api-settings");
const keyInput = document.querySelector("#api-key");
const saveKey = document.querySelector("#save-key");
const clearKey = document.querySelector("#clear-key");
const keyStatus = document.querySelector("#key-status");

async function saveApiKey(key) {
  keyInput.disabled = true;
  saveKey.disabled = true;
  clearKey.disabled = true;
  try {
    if (key) {
      await chrome.storage.local.set({ [API_KEY_SETTING]: key });
    } else {
      await chrome.storage.local.remove(API_KEY_SETTING);
    }
    keyInput.value = key;
    keyStatus.textContent = key ? "API Key 已保存。" : "API Key 已清除。";
  } catch {
    keyStatus.textContent = "保存失败。请重试。";
  } finally {
    keyInput.disabled = false;
    saveKey.disabled = false;
    clearKey.disabled = false;
  }
}

apiForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveApiKey(keyInput.value.trim());
});
clearKey.addEventListener("click", () => void saveApiKey(""));

try {
  const settings = await chrome.storage.local.get(API_KEY_SETTING);
  keyInput.value = settings[API_KEY_SETTING] ?? "";
  keyInput.disabled = false;
  saveKey.disabled = false;
  clearKey.disabled = false;
} catch {
  keyStatus.textContent = "无法读取本机扩展设置。请重新打开此页。";
}

if (chrome.mimeHandler?.getMimeHandlerOptions) {
  const section = document.querySelector("#handler-settings");
  const checkbox = document.querySelector("#handle-pdfs");
  const status = document.querySelector("#handler-status");
  try {
    const options = await chrome.mimeHandler.getMimeHandlerOptions(PDF_MIME_TYPE);
    checkbox.checked = options.enabled !== false;
    checkbox.disabled = false;
    section.hidden = false;
  } catch {
    section.hidden = false;
    status.textContent = "当前浏览器无法读取 PDF 接管设置。";
  }

  checkbox.addEventListener("change", async () => {
    const enabled = checkbox.checked;
    checkbox.disabled = true;
    try {
      await chrome.mimeHandler.setMimeHandlerOptions(PDF_MIME_TYPE, { enabled });
      status.textContent = "下次打开 PDF 时生效。";
    } catch {
      checkbox.checked = !enabled;
      status.textContent = "无法更新 PDF 接管设置。请重试。";
    } finally {
      checkbox.disabled = false;
    }
  });
}
