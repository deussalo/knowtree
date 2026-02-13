---
ID: 35
parents: [33, 34]
children: [37, 38]
---
# Backpropagation

Backpropagation computes the gradient of the loss with respect to every parameter in the network by applying the chain rule backwards through the computation graph. This algorithm is what makes training deep networks tractable — without it, there is no practical way to determine how to adjust millions or billions of parameters to reduce loss.
