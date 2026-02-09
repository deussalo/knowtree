## Content & File Structure

Every knowledge graph in Knowtree is just a directory of Markdown files. Let's look at how these files are organized and what each piece does.

### Directory Layout

```
content/
  .state/
    active-state.json          ← which graph/node is currently active
  my-graph/
    [0] Root Topic.md          ← node content file
    [1] First Child.md
    [2] Second Child.md
    specialist_style.md        ← optional custom teaching style
    .state/
      0/
        progress.json          ← learning progress for node 0
        classroom.md           ← tutor session content
        active-plot.json       ← optional Plotly chart data
      1/
        progress.json
        classroom.md
```

### Node File Format

Each node is a Markdown file named `[ID] Title.md`. The file starts with YAML frontmatter that defines the graph structure:

```yaml
---
ID: 0
parents: []
children: [1, 2, 3]
---
# Topic Title

Overview paragraph describing what this topic covers.
```

The three required frontmatter fields:

- **ID** — unique integer within the graph
- **parents** — array of parent node IDs (prerequisites)
- **children** — array of child node IDs (unlocked by this node)

### File Types

| File | Location | Purpose |
|------|----------|---------|
| `[ID] Title.md` | Graph root | Node definition: ID, relationships, overview |
| `specialist_style.md` | Graph root | Optional custom tutor personality |
| `progress.json` | `.state/<id>/` | Subconcept progress, score, completion status |
| `classroom.md` | `.state/<id>/` | Rendered tutor session content |
| `active-plot.json` | `.state/<id>/` | Plotly chart data for the graph panel |
| `active-state.json` | `content/.state/` | Global state: current view, graph, and node |

### Graph Discovery

The Go server auto-discovers graphs by scanning the `content/` directory. Any subdirectory (except `.state`) that contains `.md` files is treated as a knowledge graph. No registration or configuration needed — just create a directory, add node files, and restart or let the server pick it up.

---

## Session In Progress

Completed 3 of 5 subconcepts. Remaining:
- The .state directory: progress, classroom, and plot files
- Graph discovery: how the server auto-detects graphs
