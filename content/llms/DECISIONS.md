# LLM Knowledge Graph — Design Decisions

## Scope
80 nodes covering the full stack from mathematical foundations through modern LLM applications.
Target audience: someone with basic programming knowledge but no ML background.

## Branch Structure (5 major branches)

| Branch | IDs | Description |
|--------|-----|-------------|
| A: Mathematical Foundations | 1–15 | Linear algebra, calculus, probability, optimization, information theory |
| B: Machine Learning Foundations | 16–30 | Core ML concepts, supervised/unsupervised learning, evaluation, classical models |
| C: Neural Networks & Deep Learning | 31–48 | Perceptrons through CNNs, RNNs, regularization, training practices |
| D: Transformer Architecture & Language Modelling | 49–65 | Attention, transformers, tokenization, pretraining, scaling laws |
| E: Modern LLMs & Applications | 66–79 | RLHF, instruction tuning, prompting, agents, multimodal, safety, evaluation |

## Key Design Decisions

1. **Math-first foundation**: Branches B–E depend on Branch A concepts. Students who already know linear algebra can test out of early nodes.
2. **Cross-links over strict linearity**: Nodes reference prerequisites across branches (e.g., backpropagation requires chain rule from Branch A).
3. **Historical context embedded, not separated**: Key papers and breakthroughs are covered within their technical nodes rather than in separate history nodes.
4. **Practical application nodes included**: Each major branch ends with applied/practical nodes to ground theory.
5. **File format**: Markdown with YAML frontmatter per graph-generator.md schema. Directory: `content/llms/`.
6. **Naming convention**: `[ID] Topic Title.md` per project convention, lowercase-hyphenated directory name.
7. **No calibration quiz generated**: The user explicitly said not to ask questions. Calibration will happen when the student enters the classroom.
8. **80 nodes exactly**: IDs 0–79, sequential, no gaps.

## Cross-link Rationale

- Backpropagation (35) requires Chain Rule (5) and Gradient Descent (11)
- Word Embeddings (49) requires Vectors & Vector Spaces (1) and Dimensionality Reduction (27)
- Attention Mechanism (54) requires Matrix Multiplication (3) and Sequence Models (44)
- Loss Functions (33) requires Probability Distributions (8) and Optimization (11)
- Scaling Laws (62) requires Empirical Risk Minimisation (22) and Transformer Architecture (56)
