---
ID: 38
parents: [35, 36, 37]
children: [39, 40]
---
# Batch Normalisation & Layer Normalisation

Normalisation techniques stabilise training by controlling the distribution of activations between layers. Batch normalisation normalises across the batch dimension; layer normalisation normalises across the feature dimension. Transformers use layer normalisation specifically because it works with variable-length sequences and doesn't depend on batch statistics.
