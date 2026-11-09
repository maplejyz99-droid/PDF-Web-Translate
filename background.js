import { parseArxivPdfUrl, READER_PATH } from "./pdf-source.js";

chrome.action.onClicked.addListener(async (tab) => {
  const pdfUrl = parseArxivPdfUrl(tab.url);
  if (!pdfUrl) {
    await chrome.runtime.openOptionsPage();
    return;
  }

  const readerUrl = new URL(chrome.runtime.getURL(READER_PATH));
  readerUrl.searchParams.set("source", pdfUrl.href);
  await chrome.tabs.create({ url: readerUrl.href, openerTabId: tab.id });
});
