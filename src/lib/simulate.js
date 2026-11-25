import { buildRecords } from "./records.js";

// SIMULATED responses so the research-team view can be previewed.
// Invented data from a seeded random model (three loose friend groups plus a
// few people who bridge groups). Not real answers from anyone.
export function simulateSubmissions(roster, { seed = 270, submitRate = 0.83 } = {}) {
  const rand = mulberry32(seed);
  const ids = roster.map((p) => p.id);
  const group = new Map(ids.map((id, i) => [id, i % 3]));
  const bridge = new Set(ids.filter(() => rand() < 0.15));

  // Underlying "true" ties (symmetric), with a latent closeness.
  const tie = new Map();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      const same = group.get(a) === group.get(b);
      const p = same ? 0.42 : bridge.has(a) || bridge.has(b) ? 0.2 : 0.03;
      if (rand() < p) tie.set(key(a, b), 1 + Math.floor(rand() * 5));
    }
  }

  const start = Date.parse("2026-11-16T15:00:00Z");
  const subs = [];
  for (const me of ids) {
    if (rand() > submitRate) continue; // some people never submit
    const others = ids.filter((id) => id !== me);
    const stopsEarly = rand() < 0.1 ? Math.floor(others.length * (0.5 + rand() * 0.3)) : others.length;
    const answers = {};
    others.forEach((pid, i) => {
      if (i >= stopsEarly) return; // left unanswered
      const t = tie.get(key(me, pid));
      const r = rand();
      if (t) {
        if (r < 0.88) {
          const rating = rand() < 0.15 ? null : clamp(t + Math.round(rand() * 2 - 1), 1, 5);
          answers[pid] = { status: "yes", rating };
        } else if (r < 0.94) answers[pid] = { status: "no" };
        else answers[pid] = { status: "skip" };
      } else {
        if (r < 0.9) answers[pid] = { status: "no" };
        else if (r < 0.97) answers[pid] = { status: "skip" };
        else answers[pid] = { status: "yes", rating: 1 };
      }
    });
    const submittedAt = new Date(start + Math.floor(rand() * 6 * 24 * 3600 * 1000)).toISOString();
    subs.push({ respondentId: me, submittedAt, simulated: true, rows: buildRecords(me, others, answers, submittedAt) });
  }
  return subs;
}

const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
