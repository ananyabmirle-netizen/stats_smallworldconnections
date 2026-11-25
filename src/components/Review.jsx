import { useState } from "react";
import { IS_DEMO } from "../config.js";
import { summarize } from "../lib/records.js";
import { Avatar, RATINGS, useFocusOnChange } from "./Bits.jsx";

function answerText(a) {
  if (a?.status === "yes") {
    const r = RATINGS.find((x) => x.value === a.rating);
    return r ? `Yes, ${r.short.toLowerCase()}` : "Yes";
  }
  if (a?.status === "no") return "No";
  if (a?.status === "skip") return "Skipped";
  return "Not answered";
}

export default function Review({ order, byId, answers, onEdit, onSubmit, submitting, error }) {
  const headingRef = useFocusOnChange("review");
  const [confirmed, setConfirmed] = useState(false);
  const c = summarize(order, answers);
  const unknown = c.skip + c.unanswered;

  return (
    <main className="screen">
      <section className="card">
        <h1 ref={headingRef} tabIndex={-1}>Review your answers</h1>
        <p className="lead">Here’s a summary before you submit. You can still change anything.</p>

        <dl className="tally">
          <div className="tally-yes"><dt>Yes</dt><dd>{c.yes}</dd></div>
          <div className="tally-no"><dt>No</dt><dd>{c.no}</dd></div>
          <div className="tally-skip"><dt>Skipped</dt><dd>{c.skip}</dd></div>
          {c.unanswered > 0 && (
            <div className="tally-none"><dt>Not answered</dt><dd>{c.unanswered}</dd></div>
          )}
        </dl>

        <p className="note">
          Skipped{c.unanswered > 0 ? " and unanswered" : ""} people are saved as unknown. They are not counted as
          “No.”{unknown > 0 ? ` Right now that’s ${unknown} ${unknown === 1 ? "person" : "people"}.` : ""}
        </p>

        <details className="answer-list">
          <summary>See or change individual answers</summary>
          <ul>
            {order.map((pid, i) => {
              const p = byId[pid];
              const a = answers[pid];
              return (
                <li key={pid}>
                  <Avatar person={p} size="sm" />
                  <span className="al-name">{p.name}</span>
                  <span className={`tag tag-${a?.status ?? "none"}`}>{answerText(a)}</span>
                  <button type="button" className="link" onClick={() => onEdit(i)}>
                    Change<span className="sr-only"> answer for {p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>

        <button type="button" className="btn btn-ghost btn-wide" onClick={() => onEdit(0)}>
          Go back to the first person
        </button>

        <div className="submit-block">
          <label className="confirm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I’ve reviewed my answers and I’m ready to submit. I understand I can’t change them afterward.</span>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={!confirmed || submitting}
            onClick={onSubmit}
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
          {IS_DEMO && <p className="demo-inline">Demo mode: submitting won’t send or save anything.</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
