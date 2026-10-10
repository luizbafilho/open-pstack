# open-pstack design

Date: 2026-10-05

## Goal

Run [pstack](https://github.com/cursor/plugins/tree/main/pstack) in OpenCode and omp with behavior as close to Cursor's as the targets allow. Upstream changes reach both targets with no manual step. When upstream adds a Cursor term the rules can't handle, the sync stops and asks for a rule instead of shipping wrong text.

The omp target replaced the Pi target this spec first planned. omp is a Pi fork, and its design lives in [2026-10-10-open-pstack-omp-design.md](./2026-10-10-open-pstack-omp-design.md). The sections below cover the shared pipeline and OpenCode.

Audience: the author first. The layout and versioning must allow publishing to npm later, but nothing gets published now.

## Success criteria

- A new upstream commit under `pstack/` ends up in `dist/opencode` and `dist/omp` on `main` within a week, with no human action, as long as the existing rules cover it.
- A sync with uncovered Cursor terms never reaches `main`. It waits in a PR that lists every finding.
- Every pstack skill can be invoked as `/<skill-id>` in OpenCode and as omp's native `/skill:<skill-id>` in omp.
- Subagent-based skills (`arena`, `interrogate`, `swarm`, `how`, `why`, `reflect`, `poteto-mode` playbooks) launch subagents with the configured per-role models in both targets.

## Decisions

| Topic | Decision |
|---|---|
| Porting method | Build-time rewrite of upstream text with typed rules. Upstream files are never edited by hand. |
| Unmatched upstream text | Hold the sync and open a PR listing the lint findings. The last good build stays on `main`. |
| Where output lives | The upstream snapshot and the generated `dist/` are both committed on `main`. |
| Model slugs | An explicit slug map per target. An unknown slug fails the lint. |
| Model config file | `~/.config/opencode/pstack-models.md` (OpenCode). omp uses the `~/.omp/agent/pstack.yml` overlay. |
| Dropped from upstream | `skills/make-bot-ui`, `automations/`, `.cursor-plugin/`, `README.md`. |
| `cursor-team-kit` references | Rewritten to "the X skill, if installed; otherwise skip". |
| Transcript skills | Kept and mapped: OpenCode reads session history through `opencode api`, and omp reads `~/.omp/agent/sessions/` JSONL. |
| Tests | Only `test/lint.test.ts`. Everything else is covered by `tsc`, the lint on the real snapshot, and a stale-`dist/` check. |
| Toolchain | Bun and TypeScript. |
| Schedule | Weekly sync, plus a rerun on every push to `main` that changes rules, build code, or adapters. |

## Repository layout

```
open-pstack/
  upstream/
    pstack/              # exact copy of cursor/plugins/pstack at UPSTREAM.json's sha
    UPSTREAM.json        # { repo, path, sha, version, syncedAt }
  rules/
    drop.ts              # paths excluded from every target
    slugs.ts             # Cursor model slug -> provider/model, per target
    common.ts            # rewrites for both targets
    opencode.ts          # OpenCode-only rewrites
    omp.ts               # omp-only rewrites
    roles.ts             # pstack role table that generates omp's task agents
    forbidden.ts         # patterns that must not appear in dist/
    allow.ts             # legitimate occurrences of forbidden patterns
  src/
    load.ts select.ts frontmatter.ts rewrite.ts agents.ts lint.ts emit.ts build.ts
  adapters/
    opencode/            # handwritten plugin code and README
    omp/                 # manifest template, default overlay and README; no code
  dist/
    opencode/            # generated, committed
    omp/                 # generated, committed
  test/
    lint.test.ts
  .github/workflows/
    ci.yml
    sync.yml
  renovate.json
  LICENSE                # MIT, for this repo's own code
```

Machines write `upstream/` and `dist/`. People edit only `rules/`, `src/` and `adapters/`.

## Build pipeline

`bun run build` runs one pure function per target. It turns the snapshot into a file map and writes it. Building twice from the same inputs gives the same bytes.

1. **Load.** Read `upstream/pstack` into `{ path, content }` entries. Binary files (images, `logo.png`) pass through unchanged.
2. **Select.** Remove paths that match `rules/drop.ts`. `docs/guide/` stays and goes through the same rules, because `poteto-help` links to its pages.
3. **Frontmatter.** Parse YAML frontmatter with the `yaml` package and map it per target:
   - Set `name` to the skill directory name (`Poteto Mode` becomes `poteto-mode`), because omp and the Agent Skills spec expect the two to match.
   - Keep `description` and `disable-model-invocation`. Both targets read the latter natively.
   - Remove `icon`, `color`, `mode`, `reminder` and `paths`. The OpenCode adapter consumes `mode` and `reminder` from `poteto-mode` before they're removed (see Adapters).
4. **Rewrite.** Apply `rules/common.ts` and then the target's own rules, in order, to every text file (`.md`, `.sh`, `.ts`, `.mjs`, `.json`, `.tsv`).
5. **Agents.** Convert `agents/*.md` to the target agent format and file names (`Comment Sicko` becomes `comment-sicko.md`).
6. **Lint.** Run the checks below. On any finding, print the findings, write nothing to `dist/`, and exit non-zero.
7. **Emit.** Delete `dist/<target>/`, write the file map, and copy in `adapters/<target>/`. Write the upstream `LICENSE` into the output, and set `version` and `pstack.upstreamSha` in `package.json` from `UPSTREAM.json`.

### Rules

```ts
type Rule = {
  id: string
  match: string | RegExp        // a string matches literally; a RegExp needs the g flag
  replace: string | ((m: string, ...groups: string[]) => string)
  files?: string                // glob; defaults to every text file
}
```

Rules apply in file order, `common.ts` first. Specific phrases go before general terms, so `Cursor's built-in create-skill` gets rewritten before a bare `Cursor` could match.

Initial rule coverage:

| Upstream (Cursor) | OpenCode |
|---|---|
| `Task` tool, "spawn with the Task tool" | `subagent` tool |
| `subagent_type: generalPurpose` | `agent: "general"` |
| `subagent_type: "poteto-agent"` | `agent: "poteto-agent"` |
| `subagent_type: "Comment Sicko"` | `agent: "comment-sicko"` |
| `run_in_background: true` | `background: true` |
| `environment: "cloud"`, "Cursor cloud agent" | removed; a local subagent in its own worktree |
| `readonly: true/false` | removed; read-only lanes use a read-only agent |
| `AskQuestion` | `question` tool |
| `~/.cursor/rules/pstack-models.mdc` | `~/.config/opencode/pstack-models.md` |
| `alwaysApply: true` rule wording in `setup-pstack` | "a file the pstack plugin loads into every session" |
| `.cursor/skills/`, `~/.cursor/skills/` | `.opencode/skills/`, `~/.config/opencode/skills/` |
| `~/.cursor/projects/<slug>/agent-transcripts/` | session history read with `opencode api` |
| Cursor's `/loop` | a background watcher subagent with a heartbeat |
| Cursor's built-in `create-skill` | write `SKILL.md` to the Agent Skills spec |
| `cursor-team-kit` skills (`deslop`, `control-ui`, `control-cli`) | "the X skill, if installed; otherwise skip" |
| Cursor model slugs | from `rules/slugs.ts` |
| `poteto-help` table row linking `/make-bot-ui` | row removed |
| transcript lookup in `poteto-mode/scripts/worktree-audit.sh` | file-scoped rule replacing the lookup with a query for the newest session per worktree through the OpenCode API (endpoint confirmed in the plan) |

The omp column lives in the omp design.

### Lint

The lint runs on the generated output of every build and fails on any of:

- **Leftover term.** A `rules/forbidden.ts` pattern matches in `dist/` text and no `rules/allow.ts` entry covers it. The initial patterns are case-sensitive: `\.cursor\b`, `\bCursor\b`, `cursor-team-kit`, `subagent_type`, `generalPurpose`, `AskQuestion`, `Task tool`, `\.mdc\b`, `api2\.cursor\.sh`, plus any model-slug-shaped token (`claude-*`, `gpt-*`, `grok-*`) missing from `rules/slugs.ts`, plus the names of dropped content (`make-bot-ui`, `automations/benny`), so no output links to something we don't ship. These are listed explicitly rather than derived from `drop.ts`, because a derived `README.md` pattern would flag the guide's own `docs/guide/README.md` links.
- **Dead rule.** A rule matched nothing in the current snapshot. This catches upstream rephrasing a sentence so a rule silently stops matching.
- **Dead allow entry.** An `allow.ts` entry (file plus exact text) matched nothing.

Each finding is `{ file, line, kind, pattern, text }`. CI prints one line per finding, and the sync job puts the same list in the PR body.

### Test

`test/lint.test.ts` is the only test. It runs the lint against small in-memory file maps and asserts that it reports a leftover forbidden term, a dead rule and a dead allow entry, and that it passes clean input. The lint is the only gate between upstream and the user's machines, so this is the one place where silent breakage would ship bad text.

## Adapters

The OpenCode adapter does three things. omp needs none of them as code, because it discovers skills and agents natively; see the omp design.

1. Expose the skills.
2. Register a `/<skill-id>` command for every skill, so upstream's `/poteto-mode`-style text stays correct with no rewrite rule.
3. Append the model config file to the system prompt when it exists. Upstream says skills use their built-in defaults when the rule is absent, so a missing file is upstream behavior and needs no extra handling.

### OpenCode (`dist/opencode/`)

```
dist/opencode/
  package.json            # name, version, pstack.upstreamSha, "main": "plugin.ts"
  plugin.ts               # from adapters/opencode
  skills/<id>/...
  agents/poteto-agent.md  agents/comment-sicko.md  agents/poteto.md
  LICENSE  README.md
```

- **Skills.** `plugin.ts` registers every `skills/*/SKILL.md` with `ctx.skill.transform`. IDs come from directory names.
- **Commands.** One `ctx.command.transform` entry per skill. The executor calls `ctx.session.prompt` with the user's text and that skill attached.
- **Model rule.** A `context` session hook reads `~/.config/opencode/pstack-models.md` and pushes it onto `event.system`.
- **Agents.** The plugin API can't add agents, so they ship as Markdown agent files:
  - `poteto-agent.md`: `mode: subagent`, body from upstream.
  - `comment-sicko.md`: `mode: subagent`, body from upstream. It keeps edit and shell access, because `/no-comments` reviews the comments it deletes and the diff it produces.
  - `poteto.md`: `mode: primary`, generated from `poteto-mode`'s `mode: true` and `reminder`. The body tells the agent to apply the `poteto-mode` skill per its reminder. It stands in for Cursor's custom mode.

### omp (`dist/omp/`)

See [the omp design](./2026-10-10-open-pstack-omp-design.md).

### Assumptions to verify first

The implementation plan starts by checking this. If it fails, work stops and the alternative goes back to the user.

1. An OpenCode plugin command executor can attach a skill by ID (`prompt.skills`) when it calls `ctx.session.prompt`.

## Automation

### `ci.yml`

Runs on every PR and every push to `main`:

1. `bun install --frozen-lockfile`
2. `tsc --noEmit`
3. `bun test`
4. `bun run build`
5. `git diff --exit-code dist/`

Branch protection on `main` requires this job.

### `sync.yml`

Triggers: a weekly cron (`17 6 * * 1`, Mondays 06:17 UTC), `workflow_dispatch`, and pushes to `main` or `sync/upstream` that change `rules/**`, `src/**` or `adapters/**`.

1. Get the newest upstream commit under `pstack/` with `gh api repos/cursor/plugins/commits?path=pstack&per_page=1`. Exit if its SHA equals `UPSTREAM.json.sha` and the run wasn't triggered by a push.
2. If `sync/upstream` already holds that SHA, or carries rule, build or adapter commits `main` lacks, check it out, merge `main` into it, and fetch that SHA on top. Otherwise reset it to `main`, sparse-checkout `pstack/` at that SHA into `upstream/pstack/`, and write `UPSTREAM.json`.
3. Run `bun run build`.
   - **Build passes.** If nothing changed relative to `main`, close any open sync PR and exit. Otherwise commit the snapshot and `dist/`, force-push, open or update the PR `sync: pstack <version> (<short sha>)`, remove the `sync-held` label, and enable squash auto-merge.
   - **Lint fails.** Commit only the snapshot, force-push, update the same PR with the findings in its body, add `sync-held`, and leave auto-merge off.

A held sync clears when someone pushes rule fixes to the held PR's `sync/upstream` branch. That push reruns the sync on top of the branch instead of resetting it, the build passes, and the PR auto-merges. A rules PR against `main` can't clear it: its CI builds `main`'s older snapshot, where rules written for the new upstream text are dead.

Only the workflow and rule fixes for a held sync write `sync/upstream`, so there's at most one open sync PR. It authenticates with a fine-grained PAT stored as the `SYNC_TOKEN` secret, with contents and pull-request write access on this repo. A PAT is needed because GitHub doesn't run workflows for PRs opened with `GITHUB_TOKEN`, and without them auto-merge never fires.

### Renovate

`renovate.json` pins dependencies to exact versions and sets `automerge: true` for `@opencode/plugin`. A bump merges only when `ci.yml` passes. The omp target has no dependencies.

## Versioning

`dist/*/package.json` sets `version` to the upstream `plugin.json` version and records `pstack.upstreamSha`. Packages aren't published yet. How to version adapter-only fixes gets decided before the first npm release.

## Delivery

The user's dotfiles own installation:

- A mise bootstrap task:
  - clones the repo to `~/.local/share/open-pstack`
  - adds `dist/opencode` to `plugins` in the OpenCode config source
  - runs `bun install --frozen-lockfile` in `dist/opencode`, which imports `@opencode/plugin` and `yaml`
  - symlinks `dist/opencode/agents/*.md` into `~/.config/opencode/agents/`
  - installs the omp plugin from the marketplace and links its role overlay, per the omp design's dotfiles delivery
- A systemd user timer runs Mondays at 09:00 local time. It runs `git pull --ff-only` and the same `bun install`. New sessions pick up the change. If OpenCode doesn't reload a path plugin on its own, the timer also runs `opencode service restart`. The plan checks which case applies.

## License

Upstream is MIT, copyright Lauren Tan. Its `LICENSE` stays in `upstream/pstack/` and gets copied into each `dist/` target. This repo's own code is MIT under the top-level `LICENSE`.

## Delivery order

Two implementation plans. The OpenCode plan builds the shared pipeline, the OpenCode target, CI, sync and delivery, and runs with `opencode` as the only target. The omp plan starts only after the OpenCode target works on the user's machine, and adds the `omp` target described in the omp design.

## Out of scope

- Publishing to npm.
- Porting `cursor-team-kit` or any other Cursor plugin.
- Cursor custom-mode behavior on omp.
- Cloud execution. Every subagent runs locally.
