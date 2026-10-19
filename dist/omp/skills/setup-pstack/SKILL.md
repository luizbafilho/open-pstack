---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes `~/.omp/agent/pstack.yml`, the config overlay that sets each pstack agent's model. Use for /skill:setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.omp/agent/pstack.yml`, a config overlay that sets the model of every pstack agent through `modelRoles`.

## Steps

### 1. Detect available models

Run `omp models` to list the models available in this setup, grouped by provider. A selector is `provider/model:effort`, and the `thinking` column lists the efforts each model accepts. If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.

### 2. Load current state

The default role-to-model mapping is the file shape shown in step 5 below. If `~/.omp/agent/pstack.yml` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A `pstack-*` key that is not in step 5 is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer the `ask` tool over free text. Offer these four options with these exact labels, and name the current budget when the file records one. With no file, say that `large` matches the skill defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). `unlimited`, `large`, `medium`, and `small` set the effort token of every real slug, panel entries included, to `max`, `xhigh`, `high`, or `medium`. The effort token is the `:effort` suffix of a selector, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. If the result is not a detected slug, use the same family's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change. So `unlimited` turns `anthropic/claude-opus-5-5:xhigh` into `anthropic/claude-opus-5-5:max`. Grok slugs top out at `xhigh`, so under `unlimited` the fallback puts Grok at `xhigh` and keeps `opencode-zen/grok-4.7:xhigh` as it is. `large` keeps both defaults. `small` turns them into `anthropic/claude-opus-5-5:medium` and `opencode-zen/grok-4.7:medium`.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, and step 5 writes them as `"@default"`) as the options. Prefer the `ask` tool over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count, up to two, one per seat agent. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.

### 5. Write the overlay

Write `~/.omp/agent/pstack.yml`: a `# budget` comment with the chosen label and its target effort, one `modelRoles` key per role, and the two `task` settings pstack's playbooks need. A panel role gets one key per entry, numbered from `-1`. Write `inherit-parent` and `auto` as `"@default"`, which resolves to the parent chat model. Overwrite the whole file so re-runs stay idempotent. If the path is a symlink, write through it rather than replacing it. Shape:

```yaml
# pstack model configuration, written by /skill:setup-pstack. Delete a key to fall back to that agent's default.
# budget: large (xhigh)
modelRoles:
  # feature, refactoring
  pstack-feature: opencode-zen/grok-4.7:xhigh
  # bug-fix
  pstack-bug-fix: opencode-zen/grok-4.7:xhigh
  # perf-issue
  pstack-perf-issue: opencode-zen/grok-4.7:xhigh
  # hillclimb
  pstack-hillclimb: opencode-zen/grok-4.7:xhigh
  # judgment and prose
  pstack-judgment: anthropic/claude-opus-5-5:xhigh
  # hardest tasks
  pstack-hardest: anthropic/claude-opus-5-5:xhigh
  # how explorer
  pstack-how-explorer: opencode-zen/grok-4.7:xhigh
  # how explainer
  pstack-how-explainer: anthropic/claude-opus-5-5:xhigh
  # why investigators
  pstack-why-investigator: opencode-zen/grok-4.7:xhigh
  # why synthesizer
  pstack-why-synthesizer: anthropic/claude-opus-5-5:xhigh
  # reflect tooling
  pstack-reflect-tooling: opencode-zen/grok-4.7:xhigh
  # reflect judgment, divergent, synthesizer
  pstack-reflect-judgment: anthropic/claude-opus-5-5:xhigh
  # arena runners
  pstack-arena-runner-1: anthropic/claude-opus-5-5:xhigh
  pstack-arena-runner-2: opencode-zen/grok-4.7:xhigh
  # arena cross-judge pool
  pstack-arena-judge-1: anthropic/claude-opus-5-5:xhigh
  pstack-arena-judge-2: opencode-zen/grok-4.7:xhigh
  # swarm workers
  pstack-swarm-worker: opencode-zen/grok-4.7:xhigh
  # architect runners
  pstack-architect-runner-1: anthropic/claude-opus-5-5:xhigh
  pstack-architect-runner-2: opencode-zen/grok-4.7:xhigh
  # interrogate reviewers
  pstack-interrogate-reviewer-1: anthropic/claude-opus-5-5:xhigh
  pstack-interrogate-reviewer-2: opencode-zen/grok-4.7:xhigh
task:
  maxRecursionDepth: 3
  isolation:
    enabled: true
```

### 6. Confirm

Tell the user `~/.omp/agent/pstack.yml` was written and that it applies to the next subagent spawn. Check `$PI_CONFIG_FILES`. If it doesn't list that file, tell the user to add it to their shell environment, because omp reads the overlay only through that variable. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /skill:create-verification-skill." On yes, invoke `/skill:create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /skill:create-formal-verification-skill." On yes, invoke `/skill:create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
