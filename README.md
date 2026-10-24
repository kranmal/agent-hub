# Agent Hub

One local web page for the [Performance Agent Team](https://github.com/kranmal/perf-agent-team), the [QA Agent Team](https://github.com/kranmal/qa-agent-team) and Pretty CSV.

- Start Perf and QA runs, with a model and effort picker (default: Sonnet, low)
- **Run all**: Perf strategy, then the full QA run, in order
- Cost per run, spend overview and a cost **estimate** for any website, repo URL or folder
- Pretty CSV viewer built in
- Light, dark and auto theme

No dependencies. Needs Node.js 18+ and a signed-in Claude Code CLI (`claude auth login`).

## Run it

```bash
mkdir agent-tools && cd agent-tools
git clone https://github.com/kranmal/agent-hub.git
git clone https://github.com/kranmal/qa-agent-team.git
git clone https://github.com/kranmal/perf-agent-team.git
(cd qa-agent-team && ./install.sh)
(cd perf-agent-team && ./install.sh)      # also: brew install k6
cd agent-hub && node server.mjs           # http://127.0.0.1:4750
```

The hub starts the two team dashboards for you. Full plain-English walkthrough with diagrams: [docs/Agent-Hub-User-Guide.docx](docs/Agent-Hub-User-Guide.docx).

## Settings

| Variable | Default |
|---|---|
| `HUB_PORT` | `4750` |
| `HUB_QA_DIR` | `../qa-agent-team` |
| `HUB_PERF_DIR` | `../perf-agent-team` |
| `QA_UI_PORT` / `PERF_UI_PORT` | `4747` / `4748` |

## Safety

Listens on 127.0.0.1 only, rejects other Host/Origin headers and requires a custom header on every POST. Runs are headless, so the agents can run shell commands in the target project without asking: only point it at projects where that is acceptable. Perf phase 2 always needs your approval.

## Files

| Path | What |
|---|---|
| `server.mjs`, `index.html` | The hub |
| `PrettyCSV.html` | CSV viewer, served at `/csv` |
| `docs/Agent-Hub-User-Guide.docx` | Merged user guide (rebuild: `node docs/build-guide.js`, needs the `docx` npm package) |
| `docs/make-diagrams.py` | Draws the guide diagrams (needs Pillow) |
| `docs/source-guides/` | The original PrettyCSV and QA guides it was merged from |
