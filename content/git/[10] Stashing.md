---
ID: 10
parents: [6]
children: [19]
---
# Stashing

Temporarily shelving uncommitted changes so you can switch context without losing work. You will modify files on a feature branch, use `git stash` to save the work-in-progress, switch to another branch to handle an urgent fix, then return and apply the stash with `git stash pop`. You will practice creating named stashes with `git stash push -m "description"` and listing them with `git stash list`. Finally, you will create a new branch directly from a stash with `git stash branch`, and clean up old stashes with `git stash drop` and `git stash clear`.
