Interactive Plotly.js visualizations in the Graph Panel alongside classroom content.

<when_to_use>
Use for: plotting points/vectors/functions on coordinate planes, geometric relationships, animating processes (rotation, convergence, transformation), comparing quantities visually.

NEVER use when a Mermaid diagram, table, or KaTeX in classroom.md would suffice.
</when_to_use>

<templates>
Templates are in `plot-templates/`. Read, modify, write to NODE_STATE/active-plot.json.

| Template | Use When |
|----------|----------|
| `complex-plane.json` | Plotting points on the complex plane, showing regions |
| `complex-vectors.json` | Vectors/arrows, addition, subtraction |
| `complex-polar.json` | Polar form, magnitude, argument |
| `complex-function.json` | Plotting real/imaginary parts of functions |
| `complex-animation.json` | Animating rotation, transformation, convergence |
</templates>

<theme>
ALWAYS preserve these colors when modifying templates:

Background: plot `#262626`, paper `#1e1e1e`, grid/axis `#555`, text `#dadada`
Font: `"3270NerdFont-Regular, Courier New, monospace"`

Accents: primary (orange) `#e8a034`, secondary (blue) `#4a9eff`, highlight (green) `#4caf50`, error (red) `#ef4444`
</theme>

<modification>
Modify `data` freely: change coordinates, add/remove traces, update labels. Adjust `layout` as needed: axis ranges, titles, annotations. Add `animation` when useful via Plotly frames API for step-by-step demonstrations.

Animation: 5-30 frames, 300-1000ms per frame depending on complexity. Plays automatically on load.
</modification>

<output_format>
```json
{
  "data": [ /* Plotly trace objects */ ],
  "layout": { /* Plotly layout config */ },
  "animation": { /* optional: frames + timing */ }
}
```

The webapp polls for active-plot.json every 1s — each write triggers a re-render. Multiple updates per session are fine. If the Graph Panel is closed when a plot arrives, the edge tab pulses orange.
</output_format>
