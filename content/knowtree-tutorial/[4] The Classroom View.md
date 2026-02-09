---
ID: 4
parents: [1]
children: [7, 8]
---
# The Classroom View

The classroom is the right-hand panel in the browser that renders the tutor's teaching content in real time. It supports full Markdown via markdown-it, LaTeX math via KaTeX (both inline and display), diagrams via Mermaid, syntax-highlighted code blocks, tables, blockquotes, and interactive Plotly charts in a dedicated graph panel. As the tutor writes to `classroom.md` on disk, the webapp polls the server and live-updates the rendered content.
