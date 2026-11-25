import { useMemo, useState } from "react";
import { IS_DEMO } from "../config.js";
import { analyze, toCSV } from "../lib/analysis.js";
import { buildNetwork } from "../lib/graph.js";
import { describeSaveError, saveFile } from "../lib/download.js";
import { useFocusOnChange } from "./Bits.jsx";
import NetworkGraph from "./NetworkGraph.jsx";

const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)}%`);
const num = (x, d = 1) => (x == null ? "–" : Number.isInteger(x) ? String(x) : x.toFixed(d));
const knowsText = (v) => (v === true ? "Yes" : v === false ? "No" : "Unknown");

export default function Admin({ roster, submissions, onLoadSample, onClear }) {
  const headingRef = useFocusOnChange("admin");
  const byId = useMemo(() => Object.fromEntries(roster.map((p) => [p.id, p])), [roster]);
  const a = useMemo(() => analyze(submissions), [submissions]);
  const network = useMemo(() => buildNetwork(submissions, roster), [submissions, roster]);
  const simulated = submissions.some((s) => s.simulated);
  const [who, setWho] = useState("");
  const [msg, setMsg] = useState("");

  const current = submissions.find((s) => s.respondentId === who) ?? submissions[0];
  const maxDist = Math.max(0, ...Object.keys(a.hist).map(Number));
  const histRows = [
    ...Array.from({ length: maxDist }, (_, i) => ({ label: `${i + 1} step${i ? "s" : ""}`, count: a.hist[i + 1] ?? 0 })),
    { label: "Not connected", count: a.disconnectedPairs, muted: true },
  ];
  const histMax = Math.max(1, ...histRows.map((r) => r.count));

  async function downloadResponses() {
    setMsg("");
    try {
      const rows = submissions.flatMap((s) => s.rows);
      await saveFile(`${simulated ? "simulated-" : ""}responses-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), "text/csv");
    } catch (e) {
      const t = describeSaveError(e);
      if (t) setMsg(t);
    }
  }

  return (
    <main className="screen admin">
      <section className="card admin-card">
        <h1 ref={headingRef} tabIndex={-1}>Research team results</h1>
        {IS_DEMO && (
          <div className="demo-box">
            <p>
              <strong>Demo admin page, no sign-in.</strong> It only shows mock or simulated data from this browser
              tab. In the real study this page must sit behind university sign-in checked on the server, limited to
              the research team. A password in the frontend code would not protect anything.
            </p>
          </div>
        )}
        <div className="admin-actions">
          <button type="button" className="btn btn-primary" onClick={onLoadSample}>
            {simulated ? "Reload simulated responses" : "Load simulated responses"}
          </button>
          {submissions.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
        {simulated && (
          <p className="note">These results include simulated answers generated for testing, not real responses.</p>
        )}
      </section>

      {submissions.length === 0 ? (
        <section className="card admin-card empty">
          <h2>No responses yet</h2>
          <p className="lead">
            Take the survey from the home page, or load simulated responses to preview the results and graph.
          </p>
        </section>
      ) : (
        <>
          <section className="card admin-card" aria-labelledby="overview-h">
            <h2 id="overview-h">Overview</h2>
            <dl className="stat-grid">
              <div>
                <dt>Submitted</dt>
                <dd>
                  {a.n} <span>of {roster.length}</span>
                </dd>
              </div>
              <div className="stat-feature">
                <dt>Pairs within 6 steps</dt>
                <dd>
                  {pct(a.shareWithin6)} <span>{a.within6} of {a.totalPairs}</span>
                </dd>
              </div>
              <div>
                <dt>Median distance</dt>
                <dd>
                  {num(a.medianDistance)} <span>mean {num(a.meanDistance, 2)}</span>
                </dd>
              </div>
              <div>
                <dt>Mutual connections</dt>
                <dd>
                  {a.mutual} <span>{a.oneSided} one-sided</span>
                </dd>
              </div>
              <div>
                <dt>Not connected pairs</dt>
                <dd>{a.disconnectedPairs}</dd>
              </div>
              <div>
                <dt>Connected groups</dt>
                <dd>
                  {a.components.length} <span>largest {a.components[0] ?? 0}</span>
                </dd>
              </div>
              <div>
                <dt>Avg clustering</dt>
                <dd>{num(a.avgClustering, 2)}</dd>
              </div>
              <div>
                <dt>Avg connections</dt>
                <dd>{num(a.meanDegree, 1)}</dd>
              </div>
            </dl>
            <p className="fine">
              Only people who submitted are included. A connection counts only when both people said yes. Unknown
              answers ({a.answerCounts.unknown} of {a.rowCount}) are never treated as no. Paths through people who
              didn’t submit can’t be seen.
            </p>
          </section>

          <NetworkGraph network={network} simulated={simulated} />

          <section className="card admin-card" aria-labelledby="hist-h">
            <h2 id="hist-h">Degrees of separation</h2>
            <p className="lead">Shortest path between every pair of included participants.</p>
            <ul className="hist">
              {histRows.map((r) => (
                <li key={r.label} className={r.muted ? "is-muted" : ""}>
                  <span className="hist-label">{r.label}</span>
                  <span className="hist-bar">
                    <span style={{ width: `${(r.count / histMax) * 100}%` }} />
                  </span>
                  <span className="hist-count">{r.count}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card admin-card" aria-labelledby="resp-h">
            <h2 id="resp-h">Responses</h2>
            <div className="graph-controls">
              <label>
                Respondent
                <select value={current.respondentId} onChange={(e) => setWho(e.target.value)}>
                  {submissions.map((s) => (
                    <option key={s.respondentId} value={s.respondentId}>
                      {byId[s.respondentId]?.name ?? s.respondentId}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="fine">
              Submitted {new Date(current.submittedAt).toLocaleString()}. Showing {current.rows.length} answers.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">ID</th>
                    <th scope="col">Knows</th>
                    <th scope="col">Closeness</th>
                  </tr>
                </thead>
                <tbody>
                  {current.rows.map((r) => (
                    <tr key={r.person_id}>
                      <td>{byId[r.person_id]?.name ?? "–"}</td>
                      <td className="mono-id">{r.person_id}</td>
                      <td>
                        <span className={`tag tag-${r.knows_person === true ? "yes" : r.knows_person === false ? "no" : "none"}`}>
                          {knowsText(r.knows_person)}
                        </span>
                      </td>
                      <td>{r.closeness_rating ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-ghost btn-wide" onClick={downloadResponses}>
              Download all responses (CSV)
            </button>
            {msg && (
              <p className="error" role="alert">
                {msg}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
