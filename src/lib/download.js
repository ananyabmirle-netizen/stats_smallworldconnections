// Saving files: inside a published claude.ai artifact we must use the
// platform "downloads" capability; when run locally (npm run dev) a normal
// browser download link is used.
let dlPromise = null;

export function downloadsAvailable() {
  if (!window.claude?.use) return Promise.resolve("local");
  if (!dlPromise) dlPromise = window.claude.use("downloads");
  return dlPromise.then((d) => (d ? "platform" : "none"));
}

export async function saveFile(filename, data, mime = "text/plain") {
  if (window.claude?.use) {
    if (!dlPromise) dlPromise = window.claude.use("downloads");
    const dl = await dlPromise;
    if (!dl) throw { code: "unavailable", message: "Downloads aren’t available in this view." };
    return dl.save({ filename, data });
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { status: "saved" };
}

export function describeSaveError(e) {
  switch (e?.code) {
    case "declined":
      return null; // viewer said no: stay quiet
    case "rate_limited":
      return "A save prompt is already open. Finish that one, then try again.";
    case "host_unavailable":
      return "This app can’t save files. Open the page in a browser or on a computer to download.";
    default:
      return e?.message || "The file couldn’t be saved.";
  }
}
