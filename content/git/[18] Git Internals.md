---
ID: 18
parents: [2]
children: [19]
---
# Git Internals

A deep dive into the plumbing commands and data structures beneath Git's porcelain interface. You will walk the object graph manually using `git cat-file` and `git ls-tree`, starting from `HEAD` and following references through commits, trees, and blobs. You will explore the packfile format by running `git gc` and then examining `.git/objects/pack/` to see how Git compresses objects with delta encoding. You will use `git reflog` to explore the hidden history of HEAD and branch tip movements, recovering a commit that was "lost" after a hard reset. Finally, you will use plumbing commands like `git update-ref`, `git write-tree`, and `git commit-tree` to create a commit entirely without porcelain commands.
