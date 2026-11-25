// Network analysis for the research-team view, following the proposal:
// - Included participants = people who submitted (complete respondents).
// - An edge exists only when BOTH people answered knows_person === true.
// - BFS treats every edge as 1 step; ratings never change distances.
// - Within-6 share uses n(n-1)/2 as the denominator, disconnected pairs included.

export function analyze(submissions) {
  const ids = submissions.map((s) => s.respondentId);
  const n = ids.length;
  const reports = new Map();
  let rowCount = 0;
  const answerCounts = { yes: 0, no: 0, unknown: 0 };
  for (const s of submissions) {
    for (const r of s.rows) {
      reports.set(`${r.respondent_id}|${r.person_id}`, r);
      rowCount += 1;
      if (r.knows_person === true) answerCounts.yes += 1;
      else if (r.knows_person === false) answerCounts.no += 1;
      else answerCounts.unknown += 1;
    }
  }

  const adj = new Map(ids.map((id) => [id, new Set()]));
  let mutual = 0;
  let oneSided = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = ids[i], b = ids[j];
      const ab = reports.get(`${a}|${b}`)?.knows_person;
      const ba = reports.get(`${b}|${a}`)?.knows_person;
      if (ab === true && ba === true) {
        adj.get(a).add(b);
        adj.get(b).add(a);
        mutual += 1;
      } else if (ab === true || ba === true) {
        oneSided += 1;
      }
    }
  }

  const totalPairs = (n * (n - 1)) / 2;
  const dists = [];
  const hist = {};
  let within6 = 0;
  const index = new Map(ids.map((id, i) => [id, i]));
  for (const src of ids) {
    const dist = bfs(adj, src);
    for (const [dst, d] of dist) {
      if (index.get(dst) <= index.get(src)) continue; // count each pair once
      dists.push(d);
      hist[d] = (hist[d] ?? 0) + 1;
      if (d <= 6) within6 += 1;
    }
  }
  dists.sort((x, y) => x - y);

  // Connected components
  const seen = new Set();
  const components = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const comp = [...bfs(adj, id).keys()];
    comp.forEach((c) => seen.add(c));
    components.push(comp.length);
  }
  components.sort((x, y) => y - x);

  // Average clustering (nodes with < 2 connections count as 0)
  let clusterSum = 0;
  for (const id of ids) {
    const nb = [...adj.get(id)];
    const k = nb.length;
    if (k < 2) continue;
    let links = 0;
    for (let x = 0; x < k; x++) for (let y = x + 1; y < k; y++) if (adj.get(nb[x]).has(nb[y])) links += 1;
    clusterSum += links / ((k * (k - 1)) / 2);
  }

  const degrees = ids.map((id) => adj.get(id).size);
  return {
    n,
    rowCount,
    answerCounts,
    totalPairs,
    mutual,
    oneSided,
    within6,
    shareWithin6: totalPairs ? within6 / totalPairs : null,
    reachablePairs: dists.length,
    disconnectedPairs: totalPairs - dists.length,
    meanDistance: dists.length ? dists.reduce((s, d) => s + d, 0) / dists.length : null,
    medianDistance: median(dists),
    hist,
    components,
    avgClustering: n ? clusterSum / n : null,
    meanDegree: n ? degrees.reduce((s, d) => s + d, 0) / n : null,
  };
}

function bfs(adj, src) {
  const dist = new Map([[src, 0]]);
  const queue = [src];
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q];
    for (const v of adj.get(u)) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u) + 1);
        queue.push(v);
      }
    }
  }
  return dist;
}

function median(sorted) {
  if (!sorted.length) return null;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

export function toCSV(rows) {
  const head = ["respondent_id", "person_id", "knows_person", "closeness_rating", "submitted_at"];
  const cell = (v) => (v === null || v === undefined ? "" : String(v));
  return [head.join(","), ...rows.map((r) => head.map((h) => cell(r[h])).join(","))].join("\n");
}
