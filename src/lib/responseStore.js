import { CONFIG } from "../config.js";

// Single place where responses leave the browser.
//
// DEMO MODE: nothing is sent or stored anywhere. The promise resolves so the
// flow can be tested end to end, and reports saved: false.
//
// LIVE MODE is intentionally not implemented. Before collecting real data,
// replace the branch below with a call to an authenticated backend endpoint
// (see README, "Before collecting real responses"). Do not put API keys or
// database credentials in this file; the browser must never hold secrets.
export async function submitResponses(records) {
  if (CONFIG.mode === "demo") {
    await new Promise((r) => setTimeout(r, 700));
    return { saved: false, mode: "demo", count: records.length };
  }

  throw new Error(
    "Submitting is turned off because no secure backend is configured yet."
  );
}

// In live mode the roster and respondent would come from the backend, keyed by
// a private per-participant link token. Demo mode uses the mock roster.
