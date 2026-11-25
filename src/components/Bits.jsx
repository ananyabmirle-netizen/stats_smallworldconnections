import { useEffect, useRef } from "react";

export const RATINGS = [
  { value: 1, short: "Acquaintance", long: "Acquaintance, barely know them" },
  { value: 2, short: "A little", long: "Know them a little" },
  { value: 3, short: "Somewhat close", long: "Somewhat close" },
  { value: 4, short: "Close", long: "Close" },
  { value: 5, short: "Very close", long: "Very close" },
];

// Header mark: two transit lines meeting at an interchange.
export function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <path d="M3 22 H13 L21 10 H29" fill="none" stroke="var(--line-0)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3 V29" fill="none" stroke="var(--line-1)" strokeWidth="4" strokeLinecap="round" />
      <rect x="11" y="12" width="10" height="8" rx="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
    </svg>
  );
}

// Welcome illustration: a tiny transit map. "You" are the interchange.
export function WelcomeArt() {
  const st = (x, y, r = 5) => <circle cx={x} cy={y} r={r} fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />;
  return (
    <svg className="welcome-art" viewBox="0 0 300 130" aria-hidden="true">
      <g fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 96 H96 L136 56 H286" stroke="var(--line-0)" />
        <path d="M60 14 L136 90 V120" stroke="var(--line-1)" />
        <path d="M136 56 L176 16 H250" stroke="var(--line-2)" />
        <path d="M136 90 H210 L240 120" stroke="var(--line-3)" strokeDasharray="1 13" />
      </g>
      {st(14, 96)}{st(56, 96)}{st(214, 56)}{st(286, 56)}{st(88, 42)}{st(250, 16)}{st(210, 90)}
      <rect x="122" y="46" width="28" height="54" rx="14" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="136" cy="61" r="5" fill="var(--ink)" />
      <circle cx="136" cy="85" r="5" fill="var(--ink)" />
    </svg>
  );
}

export function initials(name) {
  return name
    .replace(/\./g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Stable line color per random ID (purely decorative).
export function lineFor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h % 5;
}

export function Avatar({ person, size = "lg" }) {
  return (
    <span className={`avatar avatar-${size}`} style={{ "--ring": `var(--line-${lineFor(person.id)})` }} aria-hidden="true">
      {initials(person.name)}
    </span>
  );
}

// Moves keyboard/screen-reader focus to a heading whenever `key` changes.
export function useFocusOnChange(key) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, [key]);
  return ref;
}
