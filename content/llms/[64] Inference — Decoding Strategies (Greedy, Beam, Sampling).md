---
ID: 64
parents: [62, 63, 61]
children: [65]
---
# Inference — Decoding Strategies (Greedy, Beam, Sampling)

At inference time, a language model produces a probability distribution over the next token — but how you choose from that distribution dramatically affects output quality. Greedy decoding, beam search, top-k sampling, top-p (nucleus) sampling, and temperature scaling each produce different tradeoffs between coherence, diversity, and creativity.
