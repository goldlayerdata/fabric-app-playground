@AGENTS.md

## For Claude Code

- **Reviewers** (`.claude/agents/`):
  - `fact-checker`: checks changed claims against their sources; edits nothing.
  - `beginner-reader`: walks the changed lessons as the learner would; edits nothing.

  Run both after any change to lesson text, simulated output or the Visuals pages. Give them the changed files or commit range, not your conclusions.
- **Skills** (`.claude/skills/`):
  - `add-or-split-a-step`: the steps, the saved positions and the quiz references, done in the right order.
  - `release-check`: the checklist before a change goes to `main`.
- **Pushing:** never push to `main`, merge or publish unless the maintainer asks in this session.
