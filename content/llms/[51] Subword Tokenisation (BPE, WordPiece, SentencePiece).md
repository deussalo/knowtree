---
ID: 51
parents: [49]
children: [52, 53]
---
# Subword Tokenisation (BPE, WordPiece, SentencePiece)

Tokenisation determines how text is split into the units a model actually processes. Byte-Pair Encoding, WordPiece, and SentencePiece break words into subword pieces, balancing vocabulary size against sequence length. The tokeniser is the first component in any LLM pipeline and its design directly affects what the model can and cannot represent — including multilingual capability and handling of rare words.
