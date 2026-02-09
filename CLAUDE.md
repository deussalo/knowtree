# Knowtree V3

Self-directed learning system: students navigate knowledge graphs in a browser webapp and learn through Socratic dialogue with Claude in the terminal via `/tutor`.

## Architecture

- **Tutor** (Claude Code `/tutor` skill) teaches in the terminal, writes files to disk
- **Go server** (`server/main.go`) serves static files + JSON API over filesystem
- **Webapp** (vanilla HTML/CSS/JS) polls the server for content updates

Communication flow: Tutor → filesystem → Go server → webapp (polling)

## Dev Commands

```bash
# Start server (default port 3000)
go run server/main.go

# Start on custom port
go run server/main.go --port 8080

# Build server binary
go build ./server/

# Verify server
curl http://localhost:3000/api/graphs
curl http://localhost:3000/api/state
```

## Project Structure

```
server/main.go          — Go HTTP server (single file, no frameworks)
webapp/                 — Static frontend (served by Go server)
  index.html            — SPA entry point
  css/style.css         — All styles (dark theme, grey + orange)
  js/app.js             — Router, state management, orchestrator
  js/graph.js           — D3 + dagre DAG visualization
  js/classroom.js       — Markdown rendering (markdown-it + KaTeX + Mermaid)
  js/graph-panel.js     — Plotly.js visualization panel
  js/polling.js         — setTimeout-based polling manager
  js/markdown-it-katex.js — Custom KaTeX plugin for markdown-it
  lib/                  — Vendored JS libraries (D3, dagre, markdown-it, KaTeX, Mermaid, Plotly)
  fonts/                — 3270NerdFont-Regular
content/                — Knowledge graphs (auto-discovered directories)
  .state/               — Global state (active-state.json)
  <graph>/              — One directory per knowledge graph
    [ID] Topic.md       — Node content files (YAML frontmatter: ID, parents, children)
    .state/<nodeId>/    — Per-node state (progress.json, classroom.md, active-plot.json, test results)
prompts/                — Tutor behavior prompts (teaching method, assessment, etc.)
plot-templates/         — Plotly JSON templates for interactive visualizations
.claude/commands/tutor.md — /tutor skill definition
```

## Content Format

Topic files have YAML frontmatter:
```markdown
---
ID: 0
parents: []
children: [1, 2]
---
# Topic Title

Overview paragraph.
```

Node states: locked → available → in_progress → completed (+ error for parse failures).
A node unlocks when ALL parent nodes are completed. Root (ID 0) is always available.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/graphs` | List all graphs with progress |
| GET | `/api/graph/:id` | Full graph data (nodes + edges + statuses) |
| GET | `/api/graph/:id/classroom` | Classroom markdown for active node |
| GET | `/api/graph/:id/plot` | Active plot JSON for active node |
| GET/POST | `/api/state` | Read/write global active state |

## Key Design Decisions

- No external Go dependencies — standard library only
- All JS libraries vendored — fully offline capable
- Single-user, no auth
- Filesystem-based state — no database
- `setTimeout` polling (not WebSockets) for simplicity
