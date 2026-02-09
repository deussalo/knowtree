---
ID: 2
parents: [0]
children: [4, 18]
---
# The Git Object Model

Understanding how Git stores data under the hood — blobs, trees, commits, and tags as content-addressed objects in `.git/objects/`. You will use `git cat-file -t` and `git cat-file -p` to inspect each object type in a real repository, tracing how a commit points to a tree, which points to blobs and subtrees. You will manually hash a file with `git hash-object -w` and verify it appears in the object store. You will also draw the object graph for a small repository, connecting commits to their parent commits, trees, and blobs to build an intuition for how Git's content-addressable filesystem works.
