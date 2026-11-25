import { useEffect, useMemo, useState } from "react";
import {
  COMPONENT_COLORS,
  ISOLATE_COLOR,
  edgeWidth,
  edgesToCSV,
  layoutNetwork,
  networkToJSON,
  networkToSVG,
  nodeColor,
  nodeRadius,
  svgToPNGBlob,
} from "../lib/graph.js";
import { describeSaveError, downloadsAvailable, saveFile } from "../lib/download.js";

const W = 760;
const H = 560;

export default function NetworkGraph({ network, simulated }) {
  const { nodes, edges, neighbors } = network;
  const layout = useMemo(() => layoutNetwork(nodes, edges, { width: W, height: H }), [nodes, edges]);
  const [labels, setLabels] = useState("names");
  const [selected, setSelected] = useState("");
  const [dlMode, setDlMode] = useState("checking");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let live = true;
    downloadsAvailable().then((m) => live && setDlMode(m));
    return () => {
      live = false;
    };
  }, []);

  const sel = selected && neighbors.get(selected) ? selected : "";
  const isLit = (id) => !sel || id === sel || neighbors.get(sel).has(id);
  const selNode = nodes.find((nd) => nd.id === sel);
  const sorted = useMemo(() => [...nodes].sort((a, b) => a.name.localeCompare(b.name)), [nodes]);
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = simulated ? "simulated-network" : "network";

  async function save(kind) {
    setMsg("");
    setBusy(kind);
    try {
      if (kind === "png" || kind === "svg") {
        const svg = networkToSVG(network, layout, {
          width: W,
          height: H,
          labels,
          title: simulated ? "Campus connections (simulated data)" : "Campus connections",
        });
        if (kind === "svg") await saveFile(`${prefix}-${stamp}.svg`, svg, "image/svg+xml");
        else await saveFile(`${prefix}-${stamp}.png`, await svgToPNGBlob(svg, W, H, 2), "image/png");
      } else if (kind === "json") {
        await saveFile(`${prefix}-${stamp}.json`, networkToJSON(network, { simulated }), "application/json");
      } else if (kind === "csv") {
        await saveFile(`${prefix}-edges-${stamp}.csv`, edgesToCSV(network), "text/csv");
      }
    } catch (e) {
      const text = describeSaveError(e);
      if (text) setMsg(text);
    } finally {
      setBusy("");
    }
  }

  const multi = new Set(nodes.filter((nd) => nd.componentSize > 1).map((nd) => nd.component));

  return (
    <section className="card admin-card" aria-labelledby="graph-h">
      <div className="section-head">
        <h2 id="graph-h">Network graph</h2>
        <p className="lead">
          Each dot is a participant who submitted. A line means both people said they know each other. Thicker
          lines mean closer (the lower of the two ratings); dashed lines are missing a rating.
        </p>
      </div>

      <div className="graph-controls">
        <label>
          Labels
          <select value={labels} onChange={(e) => setLabels(e.target.value)}>
            <option value="names">Names</option>
            <option value="ids">Random IDs</option>
            <option value="none">None</option>
          </select>
        </label>
        <label>
          Highlight someone
          <select value={sel} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Nobody</option>
            {sorted.map((nd) => (
              <option key={nd.id} value={nd.id}>
                {nd.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="graph-frame">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Network of ${nodes.length} participants with ${edges.length} mutual connections`}
          onClick={(e) => {
            if (e.target.tagName === "svg") setSelected("");
          }}
        >
          <g>
            {edges.map((e) => {
              const a = layout.get(e.source), b = layout.get(e.target);
              const lit = !sel || e.source === sel || e.target === sel;
              return (
                <line
                  key={`${e.source}-${e.target}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  className={`g-edge${lit ? "" : " is-dim"}${sel && lit ? " is-hot" : ""}`}
                  strokeWidth={edgeWidth(e)}
                  strokeDasharray={e.closeness == null ? "4 4" : undefined}
                />
              );
            })}
          </g>
          <g>
            {nodes.map((nd) => {
              const p = layout.get(nd.id);
              const r = nodeRadius(nd);
              const label = labels === "names" ? nd.name : labels === "ids" ? nd.id : "";
              return (
                <g
                  key={nd.id}
                  className={`g-node${isLit(nd.id) ? "" : " is-dim"}`}
                  onClick={() => setSelected(nd.id === sel ? "" : nd.id)}
                >
                  <circle cx={p.x} cy={p.y} r={r + (nd.id === sel ? 3 : 0)} stroke={nodeColor(nd)} strokeWidth={2.5 + r * 0.25} className="g-dot" />
                  {label && (
                    <text x={p.x} y={p.y + r + 12} textAnchor="middle" className="g-label">
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <p className="graph-status" aria-live="polite">
        {selNode
          ? `${selNode.name} has ${selNode.degree} mutual connection${selNode.degree === 1 ? "" : "s"}.`
          : "Click a dot or pick someone above to highlight their connections."}
      </p>

      <ul className="legend">
        {[...multi].slice(0, COMPONENT_COLORS.length).map((c) => (
          <li key={c}>
            <span className="swatch" style={{ borderColor: COMPONENT_COLORS[c % COMPONENT_COLORS.length] }} />
            {c === 0 ? "Largest connected group" : `Connected group ${c + 1}`}
          </li>
        ))}
        {nodes.some((nd) => nd.componentSize === 1) && (
          <li>
            <span className="swatch" style={{ borderColor: ISOLATE_COLOR }} />
            No mutual connections
          </li>
        )}
        <li>Bigger dot = more connections</li>
      </ul>

      <div className="downloads">
        <h3>Download</h3>
        {dlMode === "none" ? (
          <p className="lead">Downloads aren’t available in this view.</p>
        ) : (
          <div className="dl-grid">
            <button type="button" className="btn btn-ghost" disabled={!!busy || dlMode === "checking"} onClick={() => save("png")}>
              {busy === "png" ? "Preparing…" : "Image (PNG)"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={!!busy || dlMode === "checking"} onClick={() => save("svg")}>
              Image (SVG)
            </button>
            <button type="button" className="btn btn-ghost" disabled={!!busy || dlMode === "checking"} onClick={() => save("json")}>
              Graph data (JSON)
            </button>
            <button type="button" className="btn btn-ghost" disabled={!!busy || dlMode === "checking"} onClick={() => save("csv")}>
              Edge list (CSV)
            </button>
          </div>
        )}
        <p className="fine">
          Images use the labels shown above. JSON and CSV use random IDs only, no names.
        </p>
        {msg && (
          <p className="error" role="alert">
            {msg}
          </p>
        )}
        <details className="code-tip">
          <summary>Load the edge list in Python</summary>
          <pre>{`import pandas as pd, networkx as nx

edges = pd.read_csv("${prefix}-edges-${stamp}.csv")
G = nx.from_pandas_edgelist(edges, "source", "target", edge_attr="closeness")
print(nx.average_clustering(G))
lengths = dict(nx.all_pairs_shortest_path_length(G))  # BFS, unweighted`}</pre>
          <p className="fine">
            The edge list only includes people with at least one connection. Use the JSON file’s node list to add
            participants with none.
          </p>
        </details>
      </div>
    </section>
  );
}
