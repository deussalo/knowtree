---
ID: 8
parents: [5]
children: [15]
---
# Undoing Changes

Techniques for safely reversing mistakes at every stage of the Git workflow. You will unstage a file with `git restore --staged`, discard working-tree changes with `git restore`, and understand why these are safer than older `git checkout --` and `git reset` patterns. You will use `git revert` to create a new commit that undoes a previous one without rewriting history. Finally, you will experiment with `git reset --soft`, `--mixed`, and `--hard` on a test branch to understand exactly what each mode affects (HEAD, staging area, working tree) and when each is appropriate.
