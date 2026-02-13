---
ID: 55
parents: [53, 54]
children: [56]
---
# Multi-Head Attention

Multi-head attention runs several attention operations in parallel, each with different learned projection matrices, then concatenates their outputs. This allows the model to attend to information from different representation subspaces at different positions simultaneously — one head might track syntactic relationships while another tracks semantic ones. Multi-head attention is the core computational unit of every transformer layer.
