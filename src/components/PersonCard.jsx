import { useEffect } from "react";
import { Avatar, RATINGS, useFocusOnChange } from "./Bits.jsx";

function Progress({ index, total, order, answers }) {
  const current = index + 1;
  const left = total - current;
  const pct = total > 1 ? (index / (total - 1)) * 100 : 100;
  return (
    <div className="progress">
      <div className="progress-text">
        <span>
          <strong>{current}</strong> of {total} people
        </span>
        <span>{left === 0 ? "Last one" : `${left} to go`}</span>
      </div>
      <div
        className={`metro${total > 48 ? " metro-dense" : ""}`}
        role="progressbar"
        aria-label="Survey progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Person ${current} of ${total}, ${left} left`}
      >
        <span className="metro-track" />
        <span className="metro-done" style={{ width: `${pct}%` }} />
        <ol className="stations" aria-hidden="true">
          {order.map((pid, i) => (
            <li key={pid} className={`st st-${answers[pid]?.status ?? "none"}${i === index ? " is-here" : ""}`} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function RatingPicker({ personId, rating, onRate }) {
  return (
    <fieldset className="rating">
      <legend>
        How close are you? <span className="optional">Optional</span>
      </legend>
      <div className="rating-options">
        {RATINGS.map((r) => (
          <label key={r.value} className={`rate${rating === r.value ? " is-on" : ""}`}>
            <input
              type="radio"
              className="sr-only"
              name={`rating-${personId}`}
              value={r.value}
              checked={rating === r.value}
              onChange={() => onRate(r.value)}
              aria-label={`${r.value}, ${r.long}`}
            />
            <span className="rate-stop" aria-hidden="true">
              <span className="rate-dot" style={{ "--s": r.value }} />
            </span>
            <span className="rate-num" aria-hidden="true">{r.value}</span>
            <span className="rate-label" aria-hidden="true">{r.short}</span>
          </label>
        ))}
      </div>
      <div className="rating-foot">
        <span>You can continue without choosing.</span>
        {rating != null && (
          <button type="button" className="link" onClick={() => onRate(null)}>
            Clear rating
          </button>
        )}
      </div>
    </fieldset>
  );
}

export default function PersonCard({ person, index, total, order, answers, answer, onAnswer, onRate, onBack, onNext, onReview, onStop }) {
  const headingRef = useFocusOnChange(person.id);
  const status = answer?.status;
  const rating = answer?.rating ?? null;
  const isLast = index === total - 1;

  // Keyboard shortcuts (ignored while typing in a field or when a dialog is open).
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof Element && t.closest("input, select, textarea, dialog[open]")) return;
      if (document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      if (k === "y") onAnswer("yes");
      else if (k === "n") onAnswer("no");
      else if (k === "s") onAnswer("skip");
      else if (k === "arrowleft" && index > 0) onBack();
      else if (k === "arrowright") onNext();
      else if (/^[1-5]$/.test(k) && status === "yes") onRate(Number(k));
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, status, onAnswer, onRate, onBack, onNext]);

  return (
    <main className="screen">
      <Progress index={index} total={total} order={order} answers={answers} />

      <section className="card person-card" aria-labelledby="person-q">
        <Avatar person={person} />
        <h1 id="person-q" ref={headingRef} tabIndex={-1} className="person-q">
          <span className="q-lead">Do you know</span> <span className="q-name">{person.name}?</span>
        </h1>

        <div className="choices" role="group" aria-label={`Do you know ${person.name}?`}>
          <button
            type="button"
            className="choice choice-yes"
            aria-pressed={status === "yes"}
            onClick={() => onAnswer("yes")}
          >
            <span className="choice-check" aria-hidden="true" />
            Yes, I know them
          </button>
          <button
            type="button"
            className="choice choice-no"
            aria-pressed={status === "no"}
            onClick={() => onAnswer("no")}
          >
            <span className="choice-check" aria-hidden="true" />
            No, I don’t know them
          </button>
        </div>

        {status === "yes" && <RatingPicker personId={person.id} rating={rating} onRate={onRate} />}

        <button
          type="button"
          className={`skip${status === "skip" ? " is-on" : ""}`}
          aria-pressed={status === "skip"}
          onClick={() => onAnswer("skip")}
        >
          {status === "skip" ? "Skipped, recorded as unknown" : "Skip this person"}
        </button>
      </section>

      <nav className="pager" aria-label="Move between people">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={index === 0}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {isLast ? "Review answers" : "Next"}
        </button>
      </nav>

      <div className="survey-links">
        <button type="button" className="link" onClick={onReview}>
          Review and submit
        </button>
        <button type="button" className="link link-quiet" onClick={onStop}>
          Stop survey
        </button>
      </div>
      <p className="kbd-hint">Shortcuts: Y yes, N no, S skip, 1–5 closeness, arrow keys to move</p>
    </main>
  );
}
