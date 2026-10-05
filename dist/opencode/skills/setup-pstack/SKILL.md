---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes a file the pstack plugin loads into every session, which overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.config/opencode/pstack-models.md`, a file the pstack plugin loads into every session. It sets pstack's model per role.

## Steps

### 1. Detect available models

Run `opencode models` to list the models available in this setup. Each model's reasoning variants (`#max`, `#xhigh`, and so on) are in the `variants` field of `opencode api get /api/model`. Redirect that output to a file and read the file, because piped `opencode api` output can be cut off. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.config/opencode/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer the `question` tool over free text. Offer these four options with these exact labels, and name the current budget when the rule records one.

- `unlimited — keep max`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). `unlimited` leaves every effort as in that table. `large`, `medium`, and `small` set the effort token of every real slug, panel entries included, to `xhigh`, `high`, or `medium`. The effort token is the `#variant` suffix of a `provider/model#variant` ID, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. If the result is not a detected slug, use the same family's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change. So `small` turns `anthropic/claude-opus-5-5#max` into `anthropic/claude-opus-5-5#medium`, and `opencode/grok-4.7#xhigh` into `opencode/grok-4.7#medium`.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model) as the options. Prefer the `question` tool over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the rule

Write `~/.config/opencode/pstack-models.md` as plain Markdown with a `# budget` line with the chosen label and its target effort, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the `subagent` tool's `model`). Alias entries in a panel list still count toward its fan-out.
# budget: unlimited (max)
feature, refactoring: opencode/grok-4.7#xhigh
bug-fix: opencode/grok-4.7#xhigh
perf-issue: opencode/grok-4.7#xhigh
hillclimb: opencode/grok-4.7#xhigh
judgment and prose: anthropic/claude-opus-5-5#max
hardest tasks: anthropic/claude-opus-5-5#max
how explorer: opencode/grok-4.7#xhigh
how explainer: anthropic/claude-opus-5-5#max
why investigators: opencode/grok-4.7#xhigh
why synthesizer: anthropic/claude-opus-5-5#max
reflect tooling: openai/gpt-5.6-sol#max
reflect judgment, divergent, synthesizer: anthropic/claude-opus-5-5#max
arena runners: anthropic/claude-opus-5-5#max, openai/gpt-5.6-sol#max, opencode/grok-4.7#xhigh
arena cross-judge pool: anthropic/claude-opus-5-5#max, openai/gpt-5.6-sol#max, opencode/grok-4.7#xhigh
swarm workers: opencode/grok-4.7#xhigh
architect runners: anthropic/claude-opus-5-5#max, openai/gpt-5.6-sol#max, opencode/grok-4.7#xhigh
interrogate reviewers: anthropic/claude-opus-5-5#max, openai/gpt-5.6-sol#max, opencode/grok-4.7#xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
