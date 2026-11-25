// Builds the social-network graph from submissions, lays it out, and exports it.
// Rules (from the proposal):
// - nodes = participants who submitted
// - edge only when BOTH people answered knows_person === true
// - edge closeness = the LOWER of the two ratings; null ("unavailable") if either is missing
// - closeness only affects drawing, never distances

export function buildNetwork(submissions, roster) {
  const nameOf = new Map(roster.map((p) => [p.id, p.name]));
  const ids = submissions.map((s) => s.respondentId);
  const reports = new Map();
  for (const s of submissions) for (const r of s.rows) reports.set(`${r.respondent_id}|${r.person_id}`, r);

  const edges = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      const ab = reports.get(`${a}|${b}`);
      const ba = reports.get(`${b}|${a}`);
      if (ab?.knows_person === true && ba?.knows_person === true) {
        const both = ab.closeness_rating != null && ba.closeness_rating != null;
        edges.push({ source: a, target: b, closeness: both ? Math.min(ab.closeness_rating, ba.closeness_rating) : null });
      }
    }
  }

  const neighbors = new Map(ids.map((id) => [id, new Set()]));
  for (const e of edges) {
    neighbors.get(e.source).add(e.target);
    neighbors.get(e.target).add(e.source);
  }

  // Components, numbered largest first
  const compOf = new Map();
  const comps = [];
  for (const id of ids) {
    if (compOf.has(id)) continue;
    const members = [id];
    compOf.set(id, -1);
    for (let q = 0; q < members.length; q++) {
      for (const v of neighbors.get(members[q])) {
        if (!compOf.has(v)) {
          compOf.set(v, -1);
          members.push(v);
        }
      }
    }
    comps.push(members);
  }
  comps.sort((x, y) => y.length - x.length);
  comps.forEach((members, c) => members.forEach((m) => compOf.set(m, c)));

  const nodes = ids.map((id) => ({
    id,
    name: nameOf.get(id) ?? id,
    degree: neighbors.get(id).size,
    component: compOf.get(id),
    componentSize: comps[compOf.get(id)].length,
  }));
  return { nodes, edges, neighbors, componentCount: comps.length };
}

// Fruchterman–Reingold force layout, seeded so the picture is stable.
export function layoutNetwork(nodes, edges, { width = 760, height = 560, iterations = 450, seed = 7 } = {}) {
  const n = nodes.length;
  if (!n) return new Map();
  const rand = mulberry32(seed);
  const cx = width / 2, cy = height / 2;
  const k = Math.sqrt((width * height) / n) * 0.6;
  const pos = nodes.map((_, i) => {
    const a = (2 * Math.PI * i) / n;
    const r = Math.min(width, height) * 0.35;
    return { x: cx + r * Math.cos(a) + (rand() - 0.5) * 20, y: cy + r * Math.sin(a) + (rand() - 0.5) * 20 };
  });
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const E = edges.map((e) => [idx.get(e.source), idx.get(e.target)]);
  let temp = width / 8;

  for (let it = 0; it < iterations; it++) {
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let x = pos[i].x - pos[j].x, y = pos[i].y - pos[j].y;
        const d = Math.max(Math.hypot(x, y), 0.01);
        if (d > k * 2.2) continue; // local repulsion only, so separate groups stay nearby
        const f = (k * k) / d;
        x = (x / d) * f; y = (y / d) * f;
        dx[i] += x; dy[i] += y; dx[j] -= x; dy[j] -= y;
      }
    }
    for (const [a, b] of E) {
      let x = pos[a].x - pos[b].x, y = pos[a].y - pos[b].y;
      const d = Math.max(Math.hypot(x, y), 0.01);
      const f = (d * d) / k;
      x = (x / d) * f; y = (y / d) * f;
      dx[a] -= x; dy[a] -= y; dx[b] += x; dy[b] += y;
    }
    for (let i = 0; i < n; i++) {
      // gentle gravity keeps loners and small groups on screen
      dx[i] += (cx - pos[i].x) * 0.08;
      dy[i] += (cy - pos[i].y) * 0.08;
      const d = Math.max(Math.hypot(dx[i], dy[i]), 0.01);
      const step = Math.min(d, temp);
      pos[i].x += (dx[i] / d) * step;
      pos[i].y += (dy[i] / d) * step;
    }
    temp = Math.max(temp * 0.985, 1.5);
  }

  // Fit into the frame with a margin for labels
  const m = 42;
  const xs = pos.map((p) => p.x), ys = pos.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (width - 2 * m) / Math.max(maxX - minX, 1);
  const sy = (height - 2 * m) / Math.max(maxY - minY, 1);
  const s = Math.min(sx, sy);
  const ox = (width - (maxX - minX) * s) / 2, oy = (height - (maxY - minY) * s) / 2;
  return new Map(nodes.map((nd, i) => [nd.id, { x: ox + (pos[i].x - minX) * s, y: oy + (pos[i].y - minY) * s }]));
}

export const COMPONENT_COLORS = ["#0d7a6a", "#2a5bd7", "#8b3da3", "#c43348", "#a56f00", "#3d7a1a"];
export const ISOLATE_COLOR = "#8a979a";

export function nodeColor(node) {
  if (node.componentSize === 1) return ISOLATE_COLOR;
  return COMPONENT_COLORS[node.component % COMPONENT_COLORS.length];
}
export function nodeRadius(node) {
  return 6 + Math.min(node.degree, 14) * 0.7;
}
export function edgeWidth(edge) {
  return edge.closeness == null ? 1.2 : 0.8 + edge.closeness * 0.9;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Standalone SVG with fixed colors (so it looks right outside the app).
export function networkToSVG({ nodes, edges }, layout, { width = 760, height = 560, labels = "names", title = "" } = {}) {
  const lines = edges
    .map((e) => {
      const a = layout.get(e.source), b = layout.get(e.target);
      const dash = e.closeness == null ? ' stroke-dasharray="4 4"' : "";
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#93a3a6" stroke-opacity="0.8" stroke-width="${edgeWidth(e).toFixed(2)}"${dash}/>`;
    })
    .join("\n    ");
  const dots = nodes
    .map((nd) => {
      const p = layout.get(nd.id);
      const r = nodeRadius(nd);
      const label = labels === "none" ? "" : labels === "ids" ? nd.id : nd.name;
      const text = label
        ? `<text x="${p.x.toFixed(1)}" y="${(p.y + r + 12).toFixed(1)}" text-anchor="middle" font-size="11" fill="#1e2a2d">${esc(label)}</text>`
        : "";
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="#ffffff" stroke="${nodeColor(nd)}" stroke-width="${(2.5 + r * 0.25).toFixed(1)}"/>${text}`;
    })
    .join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Atkinson Hyperlegible, Helvetica, Arial, sans-serif">
  <rect width="100%" height="100%" fill="#f4f7f3"/>
  ${title ? `<text x="16" y="26" font-size="14" font-weight="600" fill="#1e2a2d">${esc(title)}</text>` : ""}
  <g>
    ${lines}
  </g>
  <g>
    ${dots}
  </g>
</svg>`;
}

export function svgToPNGBlob(svgString, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("PNG export failed"));
    };
    img.src = url;
  });
}

// Data exports use random IDs only (no names), matching the analysis plan.
export function networkToJSON({ nodes, edges }, { simulated }) {
  return JSON.stringify(
    {
      meta: {
        generated_at: new Date().toISOString(),
        simulated_data: simulated,
        participants_included: nodes.length,
        edge_rule: "both participants answered knows_person = true",
        closeness_rule: "lower of the two ratings; null if either rating missing",
      },
      nodes: nodes.map((nd) => ({ id: nd.id, degree: nd.degree, component: nd.component })),
      edges: edges.map((e) => ({ source: e.source, target: e.target, closeness: e.closeness })),
    },
    null,
    2
  );
}

export function edgesToCSV({ edges }) {
  return ["source,target,closeness", ...edges.map((e) => `${e.source},${e.target},${e.closeness ?? ""}`)].join("\n");
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
