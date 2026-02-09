---
ID: 3
parents: [0]
children: [7]
---
# Content and File Structure

Every knowledge graph in Knowtree is a directory under `content/` containing Markdown files with YAML frontmatter. Each file defines a single node — its ID, parent and child relationships, and an overview paragraph. A `.state/` subdirectory holds per-node progress files, classroom transcripts, and plot data. The Go server auto-discovers these directories and serves them via a JSON API, so creating a new graph is as simple as adding a folder with properly formatted Markdown files.
