# open-pstack omp target design

Date: 2026-10-10

## Goal

Add an [omp](https://github.com/can1357/oh-my-pi) (oh-my-pi) target to open-pstack and use omp's native features wherever one fits: plugin discovery, task agents, model roles, `/skill:<id>` commands, workspace isolation, and config overlays. omp is a Pi fork, so this target replaces the planned Pi target. The OpenCode target is unchanged.

Audience: the author first. Their omp config is provisioned from `~/.dotfiles`, so a skill that writes local config must never fight the provisioner.

## Success criteria

- `bun run build` emits `dist/omp`, the lint passes, and the existing CI and sync jobs cover it with no new steps.
- `omp plugin marketplace add luizbafilho/open-pstack` followed by `omp plugin install pstack@open-pstack` installs every pstack skill and agent, with no extension code.
- Every skill runs as `/skill:<id>`, and upstream text that names `/<id>` reads `/skill:<id>` in `dist/omp`.
- Each subagent role runs on its own model: the `modelRoles.pstack-*` value when set, otherwise upstream's default for that role.
- `/setup-pstack` writes only `~/.omp/agent/pstack.yml`. Provisioning never rewrites that file, and no other writer touches it.

## Decisions

| Topic | Decision |
|---|---|
| Relation to Pi | omp replaces the planned Pi target. `rules/pi.ts`, `adapters/pi` and `pi-subagents` are dropped from the plan. |
| Packaging | A plain plugin directory with no TS extension. omp finds `skills/` and `agents/` by convention. |
| Install | A marketplace catalog at `.omp-plugin/marketplace.json` in the repo root, with a `git-subdir` source pointing at `dist/omp`. |
| Per-role models | One task agent per pstack role, each with `model: ["@pstack-<role>", "<upstream default>"]`. omp's task tool has no per-call `model`. |
| Panels | Three fixed seats per panel (`pstack-arena-runner-1..3` and so on). Panels hold at most three entries. |
| Role config | `~/.omp/agent/pstack.yml`, a config overlay loaded through `PI_CONFIG_FILES`, owned by `/setup-pstack` and nothing else. |
| Slash commands | Rewrite `/<id>` to omp's native `/skill:<id>`. No alias commands. |
| Always-on poteto-mode | None. Users start each task with `/skill:poteto-mode`. |
| Swarm isolation | `isolated: true`, which needs `task.isolation.enabled`. Replaces Cursor's cloud workers. |
| Nesting | `task.maxRecursionDepth: 3`, set in `pstack.yml`. |
| Transcripts | omp's session JSONL under `~/.omp/agent/sessions/<cwd-bucket>/`. |

## Output layout

```
dist/omp/
  package.json               # name, version, pstack.upstreamSha
  pstack.yml                 # default overlay: no roles, the task keys below
  skills/<id>/...
  agents/poteto-agent.md
  agents/poteto-agent-<role>.md
  agents/comment-sicko.md
  agents/pstack-<role>.md
  agents/pstack-<panel>-<n>.md
  LICENSE  README.md
.omp-plugin/marketplace.json  # repo root, handwritten
adapters/omp/
  package.json  README.md  pstack.yml
```

`adapters/omp/` holds no code. The build copies it into `dist/omp`, like the OpenCode adapter, and stamps `version` and `pstack.upstreamSha` into `package.json`.

`.omp-plugin/marketplace.json`:

```json
{
  "name": "open-pstack",
  "owner": { "name": "luizbafilho" },
  "plugins": [
    {
      "name": "pstack",
      "source": { "source": "git-subdir", "url": "https://github.com/luizbafilho/open-pstack", "path": "dist/omp" }
    }
  ]
}
```

## Build changes

- `src/types.ts`: `Target` becomes `"opencode" | "omp"`.
- `src/build.ts` loops over a target table, one entry per target: `{ id, rules, convertAgents, adapterDir, outDir }`. Load, select, normalize skills and lint are shared. Each target gets its own rewrite, agent conversion and emit. A lint failure in either target writes nothing to `dist/`.
- `rules/slugs.ts` gets an `omp` map with selectors in omp's `provider/model:thinking` form. The real IDs come from `omp models` during implementation, and an unknown slug fails the lint as it does now.
- `rules/roles.ts` (new) is the role table, the one source for agent generation:
  ```ts
  type Role = {
    id: string                 // agent name and modelRoles key suffix: "how-explorer" -> pstack-how-explorer
    line: string               // upstream role line: "how explorer"
    base: "poteto" | "worker"  // which body the agent gets
    readonly: boolean          // read-only tool list
    seats?: 3                  // panel: emits -1..-3
    defaults: string[]         // upstream default slug(s), one per seat for panels
  }
  ```
- `src/agents.ts` gets an omp converter. It emits `name` and `description` frontmatter for `poteto-agent` and `comment-sicko`, and one file per role or seat from `rules/roles.ts`.
- `rules/omp.ts` holds the omp rewrites (below). `rules/forbidden.ts` also gets omp-only patterns: `pstack-models`, `\.pi/`, and any `subagent` tool wording left over from the OpenCode rules.

## Agents

| Upstream spawn | omp agent | Body | Tools |
|---|---|---|---|
| `poteto-agent`, no role model | `poteto-agent` | upstream body | all |
| `poteto-agent` + `feature, refactoring` | `poteto-agent-feature` | upstream `poteto-agent` body | all |
| `poteto-agent` + `bug-fix` | `poteto-agent-bug-fix` | same | all |
| `poteto-agent` + `perf-issue` | `poteto-agent-perf-issue` | same | all |
| `poteto-agent` + `hillclimb` | `poteto-agent-hillclimb` | same | all |
| `poteto-agent` + `judgment and prose` | `poteto-agent-judgment` | same | all |
| `poteto-agent` + `hardest tasks` | `poteto-agent-hardest` | same | all |
| `how explorer` | `pstack-how-explorer` | worker prompt | `read, grep, glob, bash` |
| `how explainer` | `pstack-how-explainer` | worker prompt | `read, grep, glob, bash` |
| `why investigators` | `pstack-why-investigator` | worker prompt | all (MCP) |
| `why synthesizer` | `pstack-why-synthesizer` | worker prompt | all (MCP) |
| `reflect tooling` | `pstack-reflect-tooling` | worker prompt | all (MCP) |
| `reflect judgment, divergent, synthesizer` | `pstack-reflect-judgment` | worker prompt | all (MCP) |
| `swarm workers` | `pstack-swarm-worker` | worker prompt | all |
| `arena runners` | `pstack-arena-runner-1..3` | worker prompt | all |
| `arena cross-judge pool` | `pstack-arena-judge-1..3` | worker prompt | `read, grep, glob, bash` |
| `architect runners` | `pstack-architect-runner-1..3` | worker prompt | all |
| `interrogate reviewers` | `pstack-interrogate-reviewer-1..3` | worker prompt | `read, grep, glob, bash` |
| Comment Sicko | `comment-sicko` | upstream body | all |

The poteto role agents use the poteto role names (`pstack-feature`, `pstack-bug-fix`, …) as their `modelRoles` keys. The worker prompt is a short generated body: do the assigned work, follow the parent's instructions exactly, and report file pointers instead of pasting content.

Model frontmatter, using `pstack-how-explorer` as the example:

```yaml
model:
  - "@pstack-how-explorer"
  - <omp slug for grok-4.7-xhigh-fast>
```

Panel seats default to upstream's panel order, one model per seat.

## Role config and `/setup-pstack`

`/setup-pstack` owns `~/.omp/agent/pstack.yml` and rewrites the whole file on every run:

```yaml
# pstack per-role models. Written by /setup-pstack.
# budget: medium (high)
modelRoles:
  pstack-how-explorer: <selector>
  pstack-arena-runner-1: <selector>
  pstack-arena-runner-2: <selector>
task:
  maxRecursionDepth: 3
  isolation:
    enabled: true
```

- omp loads the file through `PI_CONFIG_FILES=~/.omp/agent/pstack.yml`. Overlays deep-merge above `config.yml`, live-reload, and are re-read by the task preflight before each spawn (`omp://settings.md`). A changed role applies to the next spawn without a restart.
- A missing overlay file is a hard error at startup. The README's install steps run `/setup-pstack` once, or copy `dist/omp/pstack.yml` into place.
- Step 1 lists models with `omp models`.
- A role left at its default gets no key, so the agent's second selector applies. Panel roles write one key per seat they use. A list shorter than 3 leaves the unused seats unset, and the skill spawns only the configured seats.
- Panel lists are capped at 3 entries. A longer list is rejected and asked again.
- `inherit-parent` and `auto` mean the parent chat model. Whether a `modelRoles` value can express that gets verified first (see Assumptions).

### Dotfiles delivery

This lands in `~/.dotfiles` as its own commit after open-pstack ships:

- Track `omp/config/pstack.yml`.
- Symlink `~/.omp/agent/pstack.yml` to it: `dotctl/src/bootstrap/omp.rs` on the Mac, the omp task in `mise.linux.toml` on Omarchy.
- Export `PI_CONFIG_FILES` in the shared shell environment.
- Give each company box a copy at `provision/roles/agents/files/<company>/omp/pstack.yml`, plus the variable.
- Declare the marketplace and the plugin install next to the existing superpowers install in `omp.rs`.

`/setup-pstack` then writes the tracked file through the symlink, and the user commits the diff. `config.yml` stays out of it: the Mac renderer overwrites that file wholesale, and the Linux merge touches only `default` and `web`.

## Rewrites (`rules/omp.ts`)

| Upstream | omp |
|---|---|
| `Task` tool, "spawn with the Task tool" | the `task` tool |
| `subagent_type: generalPurpose` + `model: <role line>` + `readonly` | `agent: "pstack-<role>"`. The agent carries the model and the tool list. |
| `subagent_type: "poteto-agent"` + role model | `agent: "poteto-agent-<role>"`, or `poteto-agent` with no role |
| `subagent_type: "Comment Sicko"` | `agent: "comment-sicko"` |
| panel text: "one per entry in the `<panel>` line" | "one per configured seat `pstack-<panel>-1..3`, read from `modelRoles` in `~/.omp/agent/pstack.yml`; all three with no file" |
| arena cross-judge family pick | read the seat selectors from `pstack.yml` (or the agent defaults) and pick the seat whose provider differs from the parent's |
| `run_in_background: true` | removed. Spawns run in the background; call `wait` only when blocked. |
| "omit Task `model`" for `inherit-parent`/`auto` | per the inherit-parent assumption below |
| swarm `environment: "cloud"`/`"local"` | `isolated: true` |
| nesting "works to depth 3" | "`task.maxRecursionDepth: 3`, set in `pstack.yml`. Sub-coordinators run as `poteto-agent`." |
| `AskQuestion` | the `ask` tool |
| `/<skill-id>` | `/skill:<skill-id>`, one regex built from the shipped skill IDs |
| Custom Mode text in `poteto-help` and the guide | "start each task with `/skill:poteto-mode`" |
| `~/.cursor/rules/pstack-models.mdc`, rule wording in `setup-pstack` | `~/.omp/agent/pstack.yml`, "the overlay omp loads through `PI_CONFIG_FILES`" |
| `.cursor/skills/`, `~/.cursor/skills/` | `.omp/skills/`, `~/.omp/agent/skills/` |
| `agent-transcripts/` in recall, reflect, session-pickup, automate-me | `~/.omp/agent/sessions/<cwd-bucket>/*.jsonl`, newest by mtime. The current session is the newest file. |
| `worktree-audit.sh` transcript lookup | newest `.jsonl` in that worktree's bucket |
| MCP discovery in `why` | "check your tool list for MCP tools (`mcp__*`)" |
| `restart Cursor`, `a Cursor restart` | `restart omp`, `an omp restart` |
| install text in `poteto-help` and `docs/guide/01-setup.md` | the marketplace commands |
| Cursor Plan Mode | omp's plan mode |
| `poteto-help` public copy URL | `https://github.com/luizbafilho/open-pstack/blob/main/dist/omp/` |

The cwd bucket is the working directory relative to `$HOME` with `/` replaced by `-` (`~/workspaces/x` becomes `-workspaces-x`), per `omp://session.md`. The rule text spells the derivation out. Rules that produce the same text for both targets move to `common.ts`. Everything else stays target-specific.

## Assumptions to verify first

The plan starts with these. If any fails, work stops and the alternative goes back to the user.

1. An unset `@pstack-<role>` alias falls through to the next selector in an agent's `model` list and doesn't fail the spawn.
2. A `modelRoles` value can mean "the parent's model" (`inherit-parent`, `auto`). If none can, `/setup-pstack` writes the session's current model for that role and tells the user.
3. `PI_CONFIG_FILES` overlays apply to task-agent model resolution and to `task.maxRecursionDepth` and `task.isolation.enabled`.
4. omp's `write` tool follows a symlinked `pstack.yml` and doesn't replace the link.
5. A `git-subdir` marketplace source installs `dist/omp` and discovers its `skills/` and `agents/`.
6. Plugin agents declared with a `tools` list run with only those tools.

## Testing

No new tests. `tsc`, the lint on the real snapshot for both targets, and CI's stale-`dist/` check cover the build. Smoke checks on the author's machine:

- install from the marketplace and confirm `/skill:how` exists and `/agents` lists the `pstack-*` agents
- run `/skill:setup-pstack` and confirm only `pstack.yml` changed
- run `/skill:how` and confirm in the task result's `resolvedModel` that the explorer ran on its role model
- run `/skill:swarm` with two workers and confirm both ran isolated

## Out of scope

- Always-on poteto-mode on omp.
- A TS extension.
- Panels larger than three seats.
- Publishing to npm.
