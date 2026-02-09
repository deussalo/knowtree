Break a topic node into atomic, testable sub-concepts forming the learning checklist.

<criteria>
Each sub-concept should be a single discrete idea that can be taught in one Socratic sequence, tested with 2-3 questions, and marked complete independently. Order from foundational to advanced — earlier sub-concepts are prerequisites for later ones. Use clear, specific labels.

Good (atomic, testable):
- "Definition of imaginary unit i and i² = -1"
- "Rectangular form a + bi and identifying real/imaginary parts"
- "Complex conjugate and its use in division"

Bad (too broad or vague):
- "Understanding complex numbers"
- "Various properties"
- "Advanced topics"
</criteria>

<output>
Write `progress.json` to NODE_STATE:

```json
{
  "nodeId": "0",
  "status": "in_progress",
  "subconcepts": [
    { "label": "Definition of imaginary unit i and i² = -1", "complete": false },
    { "label": "Rectangular form a + bi and identifying real/imaginary parts", "complete": false }
  ],
  "attempts": 0,
  "bestScore": null,
  "classroomFile": "classroom.md"
}
```
</output>
