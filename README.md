# Agent Hub

One repo with everything: a local web page (the hub) plus the Performance Agent Team, the QA Agent Team and Pretty CSV.

- Start Perf and QA runs, with a model and effort picker (default: Sonnet, low)
- **Run all**: Perf strategy, then the full QA run, in order
- Cost per run, spend overview and a cost **estimate** for any website, repo URL or folder
- Pretty CSV viewer built in
- Light, dark and auto theme

No dependencies. Needs Node.js 18+ and a signed-in Claude Code CLI (`claude auth login`).

**Demo video:** [docs/video/agent-hub-demo.mp4](docs/video/agent-hub-demo.mp4) (7 min walkthrough: install, every feature, benefits)

## Run it

```bash
git clone https://github.com/kranmal/agent-hub.git && cd agent-hub
(cd qa-agent-team && ./install.sh)
(cd perf-agent-team && ./install.sh)      # also: brew install k6
node server.mjs                           # http://127.0.0.1:4750
```

The hub starts the two team dashboards for you. Each team can also run on its own: see the README inside `qa-agent-team/` and `perf-agent-team/`. Full plain-English walkthrough with diagrams: [docs/Agent-Hub-User-Guide.docx](docs/Agent-Hub-User-Guide.docx).

## What is in the repo

```
agent-hub/
  server.mjs, index.html     the hub (port 4750)
  PrettyCSV.html             CSV viewer
  qa-agent-team/             QA agents, dashboard (4747), MCP server
  perf-agent-team/           Perf agents, k6 skill, dashboard (4748), MCP server
  docs/                      user guide, diagrams and the scripts that build them
```

The QA and Performance teams used to live in their own repos (`kranmal/qa-agent-team`, `kranmal/perf-agent-team`). Those are now archived and read-only; this repo is the maintained home for all of it. Their commit history was not carried over, only the files. The old Word guides for the two teams were left out.

## Settings

| Variable | Default |
|---|---|
| `HUB_PORT` | `4750` |
| `HUB_QA_DIR` | `./qa-agent-team` |
| `HUB_PERF_DIR` | `./perf-agent-team` |
| `QA_UI_PORT` / `PERF_UI_PORT` | `4747` / `4748` |

## Stop and reset

- **Stop all** (top right) cancels every running run on both teams, and the Run all chain. It is greyed out when nothing is running. A single run can still be cancelled from its team page.
- **Reset server** stops everything, then restarts the hub and both team servers (picking up any code you have pulled) and reloads the page. Reports and history are kept. Both buttons ask you to confirm first.
- **Clear everything…** (bottom of the Perf team and QA team pages) permanently deletes that team's run history, progress logs and cost records. A warning dialog asks "Are you sure?" first, and it is blocked while a run is in progress. Reports are **kept** (along with the runs they belong to); each report has its own red **Delete** button. Your own project folders are never touched.

## Safety

Listens on 127.0.0.1 only, rejects other Host/Origin headers and requires a custom header on every POST. Runs are headless, so the agents can run shell commands in the target project without asking: only point it at projects where that is acceptable. Perf phase 2 always needs your approval.

## Files

| Path | What |
|---|---|
| `server.mjs`, `index.html` | The hub |
| `PrettyCSV.html` | CSV viewer, served at `/csv` |
| `qa-agent-team/` | The QA agent team: agents, skill, dashboard and MCP server (see its README) |
| `perf-agent-team/` | The Performance agent team: agents, k6 skill, dashboard and MCP server (see its README) |
| `docs/Agent-Hub-User-Guide.docx` | Merged user guide (rebuild: `node docs/build-guide.js`, needs the `docx` npm package) |
| `docs/make-diagrams.py` | Draws the guide diagrams (needs Pillow) |
| `docs/source-guides/` | The original PrettyCSV guide it was merged from |
| `docs/img/` | Diagrams and screenshots used by the guide |

## Licence

MIT, see [LICENSE](LICENSE). Copyright (c) 2026 Ketan Ranmal and Claude.
