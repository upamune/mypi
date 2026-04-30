---
name: personal-repo-workflow
description: Personal repository workflow preferences for coding tasks. Use when implementing, reviewing, or debugging code in repositories owned by upamune.
---

# Personal Repo Workflow

Follow these preferences for coding tasks.

1. Prefer small, reviewable changes that match the existing repository style.
2. Use `rg` for file and text search.
3. Before editing, inspect the nearest tests, scripts, and conventions.
4. Do not rewrite unrelated code while fixing a narrow issue.
5. After changes, run the smallest useful verification command first, then broaden only when the change touches shared behavior.
6. In the final response, include changed files, verification result, and any unresolved risk.
