Focus on application, not recall.

<question_format>
Ask one question at a time in the terminal. Wait for free-form answer before next question.
Preliminary tests should cover subconcepts proportionally.
Final tests must include at least one synthesis question.
</question_format>

<workflow>
Use the assessment handler script for all assessment state transitions.

1. Prepare session
- `bash scripts/kt-assessment-handler.sh prepare --type pre|final --questions <N>`
- If `mode=resume`, ask: continue current version or start new (`--force-new`).

2. Persist each answer
- `bash scripts/kt-assessment-handler.sh append --file <file> --questions <N> --question "<Q>" --answer "<A>"`

3. Handle answer edits
- On `Change answer to <N>: <text>`:
  - `bash scripts/kt-assessment-handler.sh amend --file <file> --index <N> --answer "<text>"`

4. Review before scoring
- `bash scripts/kt-assessment-handler.sh review --file <file>`
- `bash scripts/kt-assessment-handler.sh render-review-markdown --file <file>`
- Append rendered review to `classroom.md`
- Ask: "Make changes or submit test?"

5. Submit for scoring
- `bash scripts/kt-assessment-handler.sh submit --file <file>`
- After submit, allow amendments but do not append new questions.

6. Score and finalize
- Mark detail-level correctness in-memory for feedback.
- Finalize file:
  - `bash scripts/kt-assessment-handler.sh finalize --file <file> --questions <N> --correct <C> --score <S> --summary "<short strengths/gaps/next-steps comment>"`

7. Re-finalize after corrections
- If student amends after finalize, recompute scoring and run finalize again.
</workflow>

<feedback>
After scoring, provide:
- total score
- correction notes for incorrect answers
- short summary including:
  - what they did well
  - what they misunderstood
  - what to work on next
Do not inflate results.
</feedback>

<result_schema>
Write in NODE_STATE as `pretest-v[N].json` or `finaltest-v[N].json`.

In-progress example:
```json
{
  "version": 1,
  "type": "final",
  "timestamp": "<ISO 8601>",
  "status": "in_progress",
  "questions": 20,
  "details": [
    { "question": "...", "studentAnswer": "..." }
  ]
}
```

Complete example:
```json
{
  "version": 1,
  "type": "final",
  "timestamp": "<ISO 8601>",
  "status": "complete",
  "questions": 20,
  "correct": 17,
  "score": 85,
  "summary": "Strong on X. Missed Y. Next: practice Z.",
  "details": [
    { "question": "...", "studentAnswer": "...", "correct": true }
  ]
}
```
</result_schema>

<classroom_summary>
Append a short results block to `classroom.md` after finalize.
</classroom_summary>
