export const PDF_MIME_TYPE = "application/pdf";
export const READER_PATH = "vendor/pdfjs/web/viewer.html";

export function parseArxivPdfUrl(value) {
  const url = typeof value === "string" ? URL.parse(value) : null;
  return url?.origin === "https://arxiv.org" && /^\/pdf\/.+/.test(url.pathname)
    ? url
    : null;
}
