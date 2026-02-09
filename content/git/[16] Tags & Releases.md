---
ID: 16
parents: [7]
children: [19]
---
# Tags & Releases

Marking specific points in history with tags for releases and milestones. You will create a lightweight tag with `git tag v0.1` and an annotated tag with `git tag -a v1.0 -m "First stable release"`, then compare them with `git show` to see the difference. You will push tags to a remote with `git push --tags` and delete both local and remote tags. Finally, you will simulate a release workflow: tag a commit as `v1.0`, create a hotfix on a branch, tag it as `v1.0.1`, and use `git describe` to generate version strings, understanding how tags integrate with semantic versioning and CI/CD release pipelines.
