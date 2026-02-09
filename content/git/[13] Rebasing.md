---
ID: 13
parents: [9]
children: [15]
---
# Rebasing

Replaying commits on top of a new base to maintain a linear history. You will create a feature branch, make several commits, then rebase it onto an updated `main` branch with `git rebase main`, resolving any conflicts that arise during the replay. You will use interactive rebase (`git rebase -i`) to squash multiple small commits into a single cohesive one, reorder commits, and reword commit messages. Finally, you will compare the resulting history of a rebased branch vs. a merged branch side by side, and articulate the trade-offs: cleaner history vs. preserved merge context and the golden rule of never rebasing shared branches.
