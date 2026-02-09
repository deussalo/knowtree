Generate a directed acyclic graph (DAG) of topics as individual markdown files.

<file_format>
Filename: `[ID] Topic Title.md`

```markdown
---
ID: 0
parents: []
children: [1, 2, 3]
---
# Topic Title

One paragraph overview of what this topic covers and why it matters
in the context of the broader subject.
```

The body should be 2-4 sentences. Explain what the concept is and why it matters. NEVER teach the concept — that is what the classroom session is for.
</file_format>

<topology>
| Rule | Requirement |
|------|-------------|
| Single root | Exactly one node with `parents: []`, always ID 0 |
| Root is overview | ID 0 is an introduction/overview node for the entire subject |
| Section headers | Direct children of root (`parents: [0]`) represent major sections |
| Bidirectional consistency | If A lists B as child, B MUST list A as parent |
| No cycles | The graph MUST be a DAG — no circular dependencies |
| No orphans | Every node must trace back to root through its parent chain |
| Sequential IDs | IDs are 0, 1, 2, 3... with no gaps |
| Cross-links | Allowed between related topics across sections |
</topology>

<generation_process>
1. Plan major sections (children of root) first
2. Decompose each section into atomic concepts
3. Order so prerequisites come before dependents
4. Add cross-links between related concepts in different sections
5. Validate all topology rules before writing files
</generation_process>

<validation>
Before writing files, verify:
- Exactly one root node (ID 0, parents: [])
- All IDs sequential (0 to N-1)
- Every parent-child relationship is bidirectional
- No cycles exist
- All nodes reachable from root
- No duplicate IDs
</validation>
