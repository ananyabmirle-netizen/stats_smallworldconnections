import { IS_DEMO } from "../config.js";
import { WelcomeArt, useFocusOnChange } from "./Bits.jsx";

export default function Welcome({ roster, respondentId, onChangeRespondent, total, onStart }) {
  const headingRef = useFocusOnChange("welcome");
  return (
    <main className="screen">
      <section className="card welcome-card">
        <WelcomeArt />
        <h1 ref={headingRef} tabIndex={-1}>Who do you know?</h1>
        <p className="lead">
          You’ll see the names of other consenting participants one at a time. For each person, tell us whether
          you know them. Your answers are private and will be used for this class research project.
        </p>
        <ul className="reassure">
          <li>You can skip anyone. Skipped people are recorded as unknown, not as “no.”</li>
          <li>You can go back and change answers before you submit.</li>
          <li>You can stop at any time.</li>
        </ul>
        <p className="count-line">{total} people to go through</p>

        {IS_DEMO && (
          <div className="demo-box">
            <label htmlFor="respondent">Demo: take the survey as</label>
            <select id="respondent" value={respondentId} onChange={(e) => onChangeRespondent(e.target.value)}>
              {roster.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p>
              Mock names only. In the real study each participant opens their own private link, so this picker
              won’t appear, and nothing here is saved.
            </p>
          </div>
        )}

        <button type="button" className="btn btn-primary btn-wide" onClick={onStart}>
          Start
        </button>
      </section>
    </main>
  );
}
