import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFIG, IS_DEMO } from "./config.js";
import { MOCK_ROSTER } from "./data/mockRoster.js";
import { shuffle } from "./lib/shuffle.js";
import { buildRecords } from "./lib/records.js";
import { submitResponses } from "./lib/responseStore.js";
import { Mark } from "./components/Bits.jsx";
import Welcome from "./components/Welcome.jsx";
import PersonCard from "./components/PersonCard.jsx";
import Review from "./components/Review.jsx";
import { Stopped, ThankYou } from "./components/EndScreens.jsx";
import Home from "./components/Home.jsx";
import Admin from "./components/Admin.jsx";
import { simulateSubmissions } from "./lib/simulate.js";

// In demo mode the roster is the mock list. In live mode it would be fetched
// from the backend for the signed-in respondent (consenting participants only).
const ROSTER = MOCK_ROSTER;

export default function App() {
  const [screen, setScreen] = useState("home"); // home | welcome | survey | review | done | stopped | admin
  const [respondentId, setRespondentId] = useState(ROSTER[0].id);
  const [order, setOrder] = useState([]); // person_ids, shuffled, respondent excluded
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [person_id]: { status, rating } }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  // Demo-only, in-memory "server": submissions from this tab plus any simulated ones.
  // Lost on reload. A real deployment keeps these on the backend.
  const [submissions, setSubmissions] = useState([]);

  const byId = useMemo(() => Object.fromEntries(ROSTER.map((p) => [p.id, p])), []);
  const othersCount = ROSTER.filter((p) => p.id !== respondentId).length;

  const indexRef = useRef(index);
  indexRef.current = index;
  const advanceTimer = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  function start() {
    const others = ROSTER.filter((p) => p.id !== respondentId).map((p) => p.id);
    setOrder(shuffle(others)); // fresh random order for each participant
    setAnswers({});
    setIndex(0);
    setError("");
    setScreen("survey");
  }

  function restart() {
    clearTimeout(advanceTimer.current);
    setOrder([]);
    setAnswers({});
    setIndex(0);
    setResult(null);
    setRecords([]);
    setError("");
    setScreen("welcome");
  }

  function goHome() {
    clearTimeout(advanceTimer.current);
    setOrder([]);
    setAnswers({});
    setIndex(0);
    setScreen("home");
  }

  const goNext = useCallback(() => {
    clearTimeout(advanceTimer.current);
    const i = indexRef.current;
    if (i < order.length - 1) setIndex(i + 1);
    else setScreen("review");
  }, [order.length]);

  const goBack = useCallback(() => {
    clearTimeout(advanceTimer.current);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const currentId = order[index];

  const setStatus = useCallback(
    (status) => {
      if (!currentId) return;
      setAnswers((prev) => {
        const cur = prev[currentId] ?? {};
        // Rating only belongs to a "yes"; switching away clears it.
        return { ...prev, [currentId]: { status, rating: status === "yes" ? cur.rating ?? null : null } };
      });
      clearTimeout(advanceTimer.current);
      // "No" and "Skip" move on automatically; "Yes" waits for the optional rating.
      if (status !== "yes") advanceTimer.current = setTimeout(goNext, 280);
    },
    [currentId, goNext]
  );

  const setRating = useCallback(
    (rating) => {
      if (!currentId) return;
      setAnswers((prev) => {
        const cur = prev[currentId];
        if (cur?.status !== "yes") return prev;
        return { ...prev, [currentId]: { ...cur, rating } };
      });
    },
    [currentId]
  );

  function openStopDialog() {
    clearTimeout(advanceTimer.current);
    dialogRef.current?.showModal();
  }

  function confirmStop() {
    dialogRef.current?.close();
    setAnswers({});
    setOrder([]);
    setScreen("stopped");
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const rows = buildRecords(respondentId, order, answers, new Date().toISOString());
      const res = await submitResponses(rows);
      if (IS_DEMO) {
        const submittedAt = rows[0]?.submitted_at ?? new Date().toISOString();
        setSubmissions((prev) => [
          ...prev.filter((s) => s.respondentId !== respondentId), // one submission per person
          { respondentId, submittedAt, simulated: false, rows },
        ]);
      }
      setRecords(rows);
      setResult(res);
      setScreen("done");
    } catch (e) {
      setError(`Your answers weren’t submitted. ${e.message} Please don’t close this page; try again or contact the research team.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`app${screen === "admin" ? " app-wide" : ""}`}>
      <header className="topbar">
        {screen === "survey" || screen === "review" ? (
          <div className="brand">
            <Mark />
            <span>{CONFIG.surveyTitle}</span>
          </div>
        ) : (
          <button type="button" className="brand brand-btn" onClick={goHome} aria-label="Home">
            <Mark />
            <span>{CONFIG.surveyTitle}</span>
          </button>
        )}
        {IS_DEMO && (
          <span className="badge" title="Mock names only. Responses are not saved.">
            Demo mode
          </span>
        )}
      </header>

      {screen === "home" && (
        <Home onGuest={() => setScreen("welcome")} onAdmin={() => setScreen("admin")} submissionCount={submissions.length} />
      )}

      {screen === "admin" && (
        <Admin
          roster={ROSTER}
          submissions={submissions}
          onLoadSample={() => {
            const own = submissions.filter((s) => !s.simulated);
            const ownIds = new Set(own.map((s) => s.respondentId));
            const sim = simulateSubmissions(ROSTER).filter((s) => !ownIds.has(s.respondentId));
            setSubmissions([...sim, ...own]);
          }}
          onClear={() => setSubmissions([])}
        />
      )}

      {screen === "welcome" && (
        <Welcome
          roster={ROSTER}
          respondentId={respondentId}
          onChangeRespondent={setRespondentId}
          total={othersCount}
          onStart={start}
        />
      )}

      {screen === "survey" && currentId && (
        <PersonCard
          key="survey"
          person={byId[currentId]}
          index={index}
          total={order.length}
          order={order}
          answers={answers}
          answer={answers[currentId]}
          onAnswer={setStatus}
          onRate={setRating}
          onBack={goBack}
          onNext={goNext}
          onReview={() => setScreen("review")}
          onStop={openStopDialog}
        />
      )}

      {screen === "review" && (
        <Review
          order={order}
          byId={byId}
          answers={answers}
          onEdit={(i) => {
            setIndex(i);
            setScreen("survey");
          }}
          onSubmit={submit}
          submitting={submitting}
          error={error}
        />
      )}

      {screen === "done" && <ThankYou result={result} records={records} onRestart={restart} onAdmin={() => setScreen("admin")} />}
      {screen === "stopped" && <Stopped onRestart={restart} onHome={goHome} />}

      <footer className="foot">
        {CONFIG.projectLabel}
        {IS_DEMO ? ". Demo build with mock names; no responses are saved." : "."}
      </footer>

      <dialog ref={dialogRef} className="dialog" aria-labelledby="stop-title" aria-describedby="stop-desc">
        <h2 id="stop-title">Stop the survey?</h2>
        <p id="stop-desc">Your answers haven’t been submitted. If you stop now, they won’t be sent.</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()} autoFocus>
            Keep going
          </button>
          <button type="button" className="btn btn-danger" onClick={confirmStop}>
            Stop without submitting
          </button>
        </div>
      </dialog>
    </div>
  );
}
