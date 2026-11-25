// "demo": mock roster, nothing is sent or saved.
// Switch to "live" ONLY after a real, secure backend is configured (see README).
export const CONFIG = {
  mode: "demo",
  surveyTitle: "Campus Connections",
  projectLabel: "RAIK 270H class research project",
};

export const IS_DEMO = CONFIG.mode === "demo";
