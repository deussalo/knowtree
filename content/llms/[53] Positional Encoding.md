---
ID: 53
parents: [50, 51]
children: [54, 55]
---
# Positional Encoding

Transformers process all tokens in parallel with no inherent notion of order, so positional information must be explicitly injected. Sinusoidal encodings, learned position embeddings, and rotary position embeddings (RoPE) each solve this differently. The choice of positional encoding affects how well a model handles long sequences and is an active area of research in extending LLM context windows.
