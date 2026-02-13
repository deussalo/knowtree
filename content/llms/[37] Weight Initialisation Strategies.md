---
ID: 37
parents: [35]
children: [38, 39]
---
# Weight Initialisation Strategies

How you initialise a network's weights before training begins profoundly affects whether training succeeds or fails. Xavier and He initialisation set weight scales based on layer dimensions to maintain gradient magnitudes across layers. Poor initialisation leads to vanishing or exploding gradients — a problem that plagued early deep networks and motivated many architectural innovations.
