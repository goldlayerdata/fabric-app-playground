# Contributing to the Fabric app playground

Thank you for helping. This playground teaches Power BI developers to build a Fabric app, one step at a time. Learners trust every sentence, so the bar is: **true, sourced, and simple**.

By taking part, you agree to the [code of conduct](CODE_OF_CONDUCT.md).

## The quickest ways to help

- **A step is wrong, or doesn't work.** [Open an issue](https://github.com/goldlayerdata/fabric-app-playground/issues/new?template=step-is-wrong.yml), with the lesson, the step, what you saw, and a source if you have one.
- **An idea** for a lesson, a chapter or a visual. [Open an idea](https://github.com/goldlayerdata/fabric-app-playground/issues/new?template=idea.yml).
- **A fix you can make yourself.** Open a pull request, as below.
- **A security problem?** Don't open an issue: report it privately, as [SECURITY.md](SECURITY.md) explains.

## Making a change

1. Fork the repository and create a branch.
2. Set it up:

   ```powershell
   npm ci
   npm run dev     # http://127.0.0.1:5180/ and /visuals/
   ```

3. Make the change. [MAINTAINING.md](MAINTAINING.md) has step-by-step instructions for every common task: fixing a lesson, adding or splitting a step, adding a lesson, chapter or visual, and refreshing the data.
4. Run `npm run check` until it passes, then `npm run build`.
5. Open a pull request and fill in its checklist. The **Check a pull request** workflow runs the same checks on GitHub.

The maintainers review every change before it goes live. Merging to `main` publishes the site.

## Using an AI coding tool

Welcome. Your tool reads the rules in [AGENTS.md](AGENTS.md); Claude Code reads them through `CLAUDE.md`. With Claude Code you also get two ready-made reviewers in `.claude/agents/` (`fact-checker` and `beginner-reader`) and two step-by-step skills in `.claude/skills/` (`add-or-split-a-step` and `release-check`). They run on your own Claude account, never on the maintainers'. Please run both reviewers before you open a pull request, and check what your tool wrote: you are responsible for every line you submit.

## The rules that keep it honest

These are the same rules the maintainers follow (MAINTAINING.md, section 4).

- **Source every claim.** Anything the course says about Fabric, Power BI or Rayfin must come from one of these, linked in your pull request or issue:
  - Microsoft Learn;
  - rayfin.ai;
  - the Rayfin packages' own docs and code;
  - the CLI's `--help`.

  "I think" or "it worked for me once" isn't enough. If something isn't documented, the text says so.
- **Mark simulated output.** When we can't check what the real tool prints, the line starts with `Playground:`. We never pass off a guess as the real tool's output.
- **One action per step card.** Creating a file and pasting into it are two steps.
- **Plain words first.** Start with a plain sentence in Power BI terms. Code words, counts and citations come after it, or are folded away. Don't talk down; write "we".
- **No lesson numbers in text.** Refer to lessons by their title, because numbers move. The checker enforces this.
- **Real numbers only.** Figures come from the saved answers in `data/`, never typed from memory.
- **Unofficial, and our interpretation.** This is a Gold Layer playground, not a Microsoft product, and it says so on every screen (`src/disclaimer.mjs`). Don't add Microsoft logos, or wording that sounds official.

## Nothing private

The repository is public, and so is every commit in its history. Before you push, check that your change contains none of these:

- local paths such as `C:\Users\…`;
- names or email addresses, your own included: use the made-up people at `contoso.example`;
- credentials, keys or tokens;
- client or company names;
- real workspace, item or tenant ids: use `00000000-…` placeholders.

GitHub's secret scanning and push protection are switched on for this repository, but please don't rely on them. MAINTAINING.md, section 5, has the commands to scan your change before you push.

Commit with your GitHub no-reply email address (GitHub → Settings → Emails), so your personal address doesn't end up in the history.

## Licence

By contributing, you agree that your contribution is licensed under the [MIT licence](LICENSE) of this repository. If you add a dependency, list it with its licence in `THIRD-PARTY-NOTICES.md`.
