Focus on application, not recall — the student should solve problems, not recite definitions.

<question_format>
Ask one at a time, numbered. Accept free-form text answers. Preliminary tests should cover sub-concepts proportionally. Final tests MUST include at least one synthesis question combining multiple concepts.
</question_format>

<feedback>
After ALL answers are collected: show total score, explain each incorrect answer (why wrong, correct reasoning), identify weak areas. NEVER inflate or soften results.
</feedback>

<result_schema>
Write to NODE_STATE as `pretest-v[N].json` or `finaltest-v[N].json` (N starts at 1, increments on retakes):

```json
{
  "version": 1,
  "timestamp": "<ISO 8601>",
  "questions": 8,
  "correct": 6,
  "score": 75,
  "details": [
    { "question": "...", "studentAnswer": "...", "correct": true },
    { "question": "...", "studentAnswer": "...", "correct": false }
  ]
}
```
</result_schema>

<classroom_summary>
Append a results section to classroom.md:

```markdown
## Preliminary Test Results

**Score: 6/8 (75%)**

| # | Result |
|---|--------|
| 1 | Correct |
| 2 | Incorrect — [brief explanation] |
```
</classroom_summary>
