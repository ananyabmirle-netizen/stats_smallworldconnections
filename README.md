# Campus Connections Survey (RAIK 270H)

Participant-facing roster survey for the degrees-of-separation study.
React 18 + Vite. **Currently in DEMO MODE: mock names, nothing is sent or saved.**

## Run it

```bash
npm install
npm run dev            # local dev server, open the URL it prints
npm run build          # production build in dist/
npm run build:single   # one self-contained HTML file in dist-single/
```

## Files

| File | Purpose |
| --- | --- |
| `src/config.js` | `mode: "demo"` switch and labels |
| `src/data/mockRoster.js` | 36 invented names with random IDs (mock only) |
| `src/App.jsx` | Screen flow and answer state |
| `src/components/Welcome.jsx` | Welcome screen (+ demo respondent picker) |
| `src/components/PersonCard.jsx` | One-person card, Yes/No/Skip, optional 1–5 rating, progress, Back/Next, shortcuts |
| `src/components/Review.jsx` | Yes/No/Skipped summary, edit list, confirm + submit |
| `src/components/EndScreens.jsx` | Thank-you and stopped screens |
| `src/components/Bits.jsx` | Rating scale, avatar, illustration, focus helper |
| `src/lib/records.js` | Converts answers to analysis rows |
| `src/lib/responseStore.js` | The only place responses would leave the browser (demo stub) |
| `src/lib/shuffle.js` | Per-participant random order |
| `src/styles.css` | Light/dark theme, responsive layout |
| `src/components/Home.jsx` | Home page: "Take the survey" (guest) or "Research team" |
| `src/components/Admin.jsx` | Research-team results: overview stats, separation histogram, response table, CSV export |
| `src/components/NetworkGraph.jsx` | Interactive node/edge graph with PNG, SVG, JSON, and edge-list CSV downloads |
| `src/lib/analysis.js` | Mutual edges, BFS distances, share within 6, components, clustering |
| `src/lib/graph.js` | Graph building, force layout, SVG/PNG/JSON/CSV export |
| `src/lib/simulate.js` | Seeded **simulated** responses for previewing the admin page |
| `src/lib/download.js` | File saving (platform downloads when hosted, normal download locally) |

## Data produced (one row per respondent × other participant)

```json
{ "respondent_id": "p_…", "person_id": "p_…", "knows_person": true, "closeness_rating": 4, "submitted_at": "ISO-8601" }
```

- `knows_person`: `true` (Yes), `false` (No), `null` (skipped **or** never answered; never coded as "no").
- `closeness_rating`: 1–5 only when `knows_person` is `true` and a rating was given; otherwise `null`.
- The respondent never appears in their own roster or rows.
- No network connections are computed or shown in the participant UI.

Analysis note (matches your proposal): an edge exists only if **both** people answered `true`;
for mutual edges use the lower of the two ratings for line thickness; ratings never change BFS distance.

## Research team page (demo)

The admin page has **no sign-in in demo mode** and only shows mock/simulated data held in the
browser tab (lost on reload). Do not add a frontend password: anyone can read it in the code.

Graph exports: PNG/SVG images (labels as shown on screen); `network-*.json` (nodes + edges,
IDs only) and `network-edges-*.csv` (`source,target,closeness`) for code:

```python
import pandas as pd, networkx as nx
edges = pd.read_csv("network-edges-2026-11-24.csv")
G = nx.from_pandas_edgelist(edges, "source", "target", edge_attr="closeness")
```

(The edge list omits people with zero connections; the JSON node list includes everyone.)
The app's statistics were checked against networkx on the same data and match.

## Before collecting real responses

The app does **not** save anything yet. Before going live you need:

1. **A real backend with server-side storage** you're allowed to use for student data
   (check with Dr. Polsley / Dr. Bevins; UNL may require an approved service, and the
   study may need IRB review or a formal exemption).
2. **Private per-participant links.** Each consenting person gets a unique, unguessable token
   (e.g. emailed link). The server maps token → `respondent_id`; the browser never sees email
   addresses or the name↔ID key, and remove the demo respondent picker.
3. **Server-filtered roster.** An endpoint like `GET /api/roster?token=…` returns only consenting
   participants' `{ id, name }`, already excluding the respondent.
4. **Submit endpoint.** `POST /api/responses` with the token in a header; the server derives
   `respondent_id` from the token (never trusts one sent by the client), validates values,
   sets `submitted_at`, and accepts one submission per token. Over HTTPS only.
5. **Access control.** No public read access to responses. If you use something like Supabase,
   enable Row Level Security with insert-only policies and keep service keys on the server.
6. **No secrets in this repo.** Put configuration in server environment variables.
7. **Admin access** must be enforced by the server: university SSO, an allowlist of
   research-team accounts, and results endpoints that refuse everyone else. Hiding the
   button in the UI is not access control.
8. Then implement the live branch in `src/lib/responseStore.js`, fetch the roster in `App.jsx`,
   set `mode: "live"`, and only show "received" after the server confirms the write.
