---
ID: 28
parents: [19]
children: [29]
---
# Reward, Policy & Value Functions

In RL, a policy maps states to actions, a value function estimates long-term reward, and the reward signal defines what success means. These concepts reappear directly in RLHF: the reward model scores LLM outputs, the policy is the language model itself, and PPO optimises the policy to maximise reward while staying close to the original model.
