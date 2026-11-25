import { IS_DEMO } from "../config.js";
import { Mark, useFocusOnChange } from "./Bits.jsx";

export function ThankYou({ result, records, onRestart, onAdmin }) {
  const headingRef = useFocusOnChange("done");
  return (
    <main className="screen">
      <section className="card end-card">
        <Mark size={56} />
        <h1 ref={headingRef} tabIndex={-1}>Thank you!</h1>
        {result?.saved ? (
          <p className="lead">Your answers were received. You can close this page.</p>
        ) : (
          <p className="lead">You’ve finished the survey. Thanks for taking the time.</p>
        )}

        {IS_DEMO && (
          <div className="demo-box">
            <p>
              <strong>Demo mode: nothing was sent or saved.</strong> Below are the {records.length} rows this
              submission would produce for analysis. Only this respondent’s own rows are shown.
            </p>
            <details>
              <summary>Show demo output</summary>
              <pre>{JSON.stringify(records, null, 2)}</pre>
            </details>
            <button type="button" className="btn btn-ghost btn-wide" onClick={onRestart}>
              Start a new demo run
            </button>
            <button type="button" className="btn btn-primary btn-wide" onClick={onAdmin}>
              Open the research team page
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export function Stopped({ onRestart, onHome }) {
  const headingRef = useFocusOnChange("stopped");
  return (
    <main className="screen">
      <section className="card end-card">
        <h1 ref={headingRef} tabIndex={-1}>You’ve stopped the survey</h1>
        <p className="lead">Nothing was submitted. Thanks for your time.</p>
        <button type="button" className="btn btn-ghost btn-wide" onClick={onRestart}>
          Start over
        </button>
        <button type="button" className="link" onClick={onHome}>
          Back to home
        </button>
      </section>
    </main>
  );
}
