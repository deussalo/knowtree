---
ID: 40
parents: [38, 39]
children: [41, 42]
---
# Training Deep Networks — Learning Rate Schedules

Training a deep network requires careful orchestration: warmup phases, cosine annealing, step decay, and other learning rate schedules control how aggressively parameters update over the course of training. The choice of schedule, combined with batch size and optimiser, determines whether a model converges to a good solution or diverges — this is especially critical for expensive LLM training runs.
