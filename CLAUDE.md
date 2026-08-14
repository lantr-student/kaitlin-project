# Spotter

## What this is
A personal-training agent that takes a real goal, builds the plan to reach it, watches your form through photos, and adapts week by week as you actually train.

## Standing rules
- Keep everything as simple as possible; build nothing I haven't asked for.
- After each change, explain what changed in plain English.
- Ask before touching anything outside this project folder.
- If a request is ambiguous, could apply to multiple components, needs a design detail I don't have (color, spacing, copy), or would touch shared components used elsewhere — ask one specific question before implementing.
- Always ask questions to clarify design details
- After a major change (a real feature, a significant bug fix, or a major removal), log it to `CHANGELOG.txt` — see below. Skip minor/cosmetic tweaks entirely; ask first if unsure whether something qualifies.

## What's placeholder
- Onboarding now submits the profile to the backend (`POST /plan`), which LLM-generates a real weekly plan shown on the Plan and Log pages. Coach chat sends each message to the backend (`POST /chat`) and shows the real reply. Both fall back to mocked data in `lib/data.ts` when no backend response is available yet (e.g. a page loaded without going through onboarding this session).
- Log, progress, and profile stats/history still run entirely on local app state and hardcoded data in `lib/data.ts` — no persisted workout history, database, or real accounts yet.
- Photo-based form-checking isn't built yet — no photo capture or upload exists in the app.
- Update this section as real functionality replaces the placeholders.

## How to run it
npm run dev, then open http://localhost:3000

## Changelog
`CHANGELOG.txt` has two parts with opposite editing rules:
- **Dated log** (top, most-recent-first): major changes only, no minor/cosmetic tweaks, plain chronological order — not grouped or prefixed by page. If a feature already has a bullet under today's date and changes again the same day, update that bullet in place instead of adding a new one (the only "by feature" behavior — bullets still stay in their original chronological spot). Entries under a past date are permanent — never edited or removed. Beyond that routine same-day update, always ask before editing or removing anything already logged. A removed feature gets its own dated bullet rather than an edit to the old one that introduced it. When something does get logged, state what changed, not a before/after of the prior implementation.
- **"Main changes from original"** (below the dated log): a living summary of the site's *current* state, not a history. Add to a page's section only for changes significant enough to belong in an overview; when something it describes is later removed or changed, edit/delete that bullet so it never mentions anything that no longer exists.
- **Always summarize what changed in `CHANGELOG.txt` itself**, every time it's revised — a report on the changelog edit, separate from summarizing the underlying code change.

@AGENTS.md
