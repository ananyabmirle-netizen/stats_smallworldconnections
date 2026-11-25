import { IS_DEMO } from "../config.js";
import { WelcomeArt, useFocusOnChange } from "./Bits.jsx";

export default function Home({ onGuest, onAdmin, submissionCount }) {
  const headingRef = useFocusOnChange("home");
  return (
    <main className="screen">
      <section className="card welcome-card">
        <WelcomeArt />
        <h1 ref={headingRef} tabIndex={-1}>How many stops between us?</h1>
        <p className="lead">A class study on how closely people on campus are connected. Choose how you’re visiting.</p>
        <div className="roles">
          <button type="button" className="role" onClick={onGuest}>
            <span className="role-title">Take the survey</span>
            <span className="role-desc">Guest or participant view. Go through the roster one name at a time.</span>
          </button>
          <button type="button" className="role role-admin" onClick={onAdmin}>
            <span className="role-title">Research team</span>
            <span className="role-desc">
              See results and the network graph.
              {IS_DEMO ? " Demo: open to anyone, mock data only." : ""}
              {submissionCount > 0 ? ` ${submissionCount} submitted so far.` : ""}
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
