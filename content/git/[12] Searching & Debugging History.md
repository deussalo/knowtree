---
ID: 12
parents: [5]
children: [19]
---
# Searching & Debugging History

Using Git as a detective tool to find when and where changes happened. You will use `git log -S "search term"` (the pickaxe) to find commits that added or removed a specific string, and `git log -G "regex"` for pattern-based searches. You will search the current codebase with `git grep` to find all occurrences of a function or variable. Finally, you will use `git bisect` to perform a binary search through history — marking commits as good or bad — to pinpoint exactly which commit introduced a bug, practicing both the manual workflow and an automated bisect with a test script.
