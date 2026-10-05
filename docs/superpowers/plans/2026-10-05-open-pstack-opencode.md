# open-pstack OpenCode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared rewrite pipeline and ship pstack as an OpenCode plugin that a weekly GitHub Action keeps in sync with upstream.

**Architecture:** A Bun/TypeScript build reads a pinned snapshot of `cursor/plugins/pstack`, applies typed rewrite rules, lints the output for leftover Cursor terms, and writes `dist/opencode/`. A handwritten OpenCode plugin in that directory registers the skills, one slash command per skill, and the model-config rule. A sync workflow refreshes the snapshot weekly and auto-merges when the lint passes.

**Tech Stack:** Bun 1.4, TypeScript (strict), `yaml`, `@opencode/plugin` 2.0.23, GitHub Actions, Renovate.

**Spec:** `docs/superpowers/specs/2026-10-05-open-pstack-design.md`

## Global Constraints

- The only target in this plan is `opencode`. `type Target = "opencode"`; the Pi plan widens it later.
- Never hand-edit `upstream/` or `dist/`. Only `rules/`, `src/`, `adapters/`, workflows and docs are edited by hand.
- Dependencies are pinned to exact versions (no `^` or `~`).
- The only test file is `test/lint.test.ts`. Every other task is verified with commands.
- The build is deterministic: running `bun run build` twice in a row leaves `git status` clean.
- Skill IDs come from directory names. Frontmatter `name` is set to the directory name.
- Model config path: `~/.config/opencode/pstack-models.md`.
- Sync schedule: `17 6 * * 1`. Delivery timer: Mondays 09:00 local.
- Upstream source: repo `cursor/plugins`, path `pstack`.
- No fallback code paths beyond what the spec names. A missing `pstack-models.md` is upstream behavior (use skill defaults), not a fallback.

## Review Focus

1. Binary upstream files (`assets/logo.png`, `docs/guide/images/*.jpg`) must come out byte-identical. Task 3 checks this with `cmp`.
2. `poteto-mode`'s frontmatter `name: Poteto Mode` must still yield a `/poteto-mode` command and skill ID `poteto-mode`. Task 5 checks it in the command list.
3. With no `~/.config/opencode/pstack-models.md`, sessions must work with no error; with the file present, its text must reach the model. Task 5 checks both.
4. A sync run with no upstream change must not open, update or churn a PR. Task 7 runs the workflow twice.
5. A rule must not corrupt code or URLs it happens to match, such as `cursor.com/docs` links or the `@cursor-skill/poteto-mode-tools` package name in `bun.lock`. Task 4 reviews the full `dist/` diff for these before committing.

---

### Task 1: Spike the OpenCode assumptions (throwaway)

Confirms the two things the docs didn't: a path plugin can import `@opencode/plugin`, and a plugin command can attach a skill. Also finds out whether a path plugin reloads without a service restart. Nothing from this task is committed.

**Files:**
- Create (throwaway): `/tmp/opencode/spike/plugin/package.json`, `/tmp/opencode/spike/plugin/index.ts`, `/tmp/opencode/spike/project/opencode.json`

- [ ] **Step 1: Write a minimal plugin**

`index.ts` uses `Plugin.define` from `@opencode/plugin`. In `setup` it:
- adds skill `spike-skill` through `ctx.skill.transform` with `content: "Reply with exactly: SPIKE-SKILL-LOADED"` and `autoinvoke: false`
- adds command `spike-skill` whose `execute` calls `ctx.session.prompt({ ...prompt, sessionID, delivery, skills: [...(prompt.skills ?? []), { id: "spike-skill", name: "spike-skill" }] })`

`package.json` pins `"@opencode/plugin": "2.0.23"`. Run `bun install` in the plugin directory.

- [ ] **Step 2: Load it from a project config**

`project/opencode.json`: `{ "$schema": "https://opencode.ai/config.json", "plugins": ["/tmp/opencode/spike/plugin"] }`

Run in `/tmp/opencode/spike/project`: `opencode --standalone api get /api/command`
Expected: the output lists `spike-skill`. If the `api` subcommand rejects `--standalone`, run `opencode service restart` first and drop the flag.

- [ ] **Step 3: Invoke the command**

Run in `/tmp/opencode/spike/project`: `opencode run "/spike-skill go"`
Expected: the reply contains `SPIKE-SKILL-LOADED`.

- [ ] **Step 4: Check reload behavior**

Change the skill content to `SPIKE-SKILL-V2`, then rerun Step 3 without restarting anything. Record whether the reply shows V2 or V1. If V1, run `opencode service restart`, rerun, and confirm V2.

- [ ] **Step 5: Report**

Write three one-line results (import works, skill attachment works, reload needs restart yes/no) into the task report. **If Step 2 or Step 3 fails, stop the plan and report to the user with the error output.** Do not work around it.

---

### Task 2: Scaffold, upstream fetcher and first snapshot

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `LICENSE`, `src/types.ts`, `src/fetch-upstream.ts`
- Create (generated): `upstream/pstack/**`, `upstream/UPSTREAM.json`

**Interfaces:**
- Produces, in `src/types.ts`:

```ts
export type Target = "opencode"
export type FileContent = string | Uint8Array      // string = UTF-8 text, Uint8Array = binary
export type FileMap = Map<string, FileContent>      // key: POSIX path relative to the tree root, sorted on emit
export type Rule = {
  id: string
  match: string | RegExp                            // RegExp must have the g flag
  replace: string | ((m: string, ...groups: string[]) => string)
  files?: string                                    // Bun.Glob pattern; default: every text file
}
export type RuleHit = { id: string; hits: number }
export type Forbidden = { id: string; pattern: RegExp }   // g flag
export type Allow = { file: string; text: string }        // exact substring on one line of that output file
export type FindingKind = "leftover" | "dead-rule" | "dead-allow"
export type Finding = { file: string; line: number; kind: FindingKind; pattern: string; text: string }
export type Upstream = { repo: string; path: string; sha: string; version: string; syncedAt: string }
```

- Produces CLI: `bun run fetch-upstream [sha]`. Without `sha` it resolves the newest commit touching `pstack/` from `https://api.github.com/repos/cursor/plugins/commits?path=pstack&per_page=1` (sends `Authorization: Bearer $GITHUB_TOKEN` when that env var is set). It prints the SHA it used on the last stdout line.

- [ ] **Step 1: Create `package.json`**

Name `open-pstack`, `"private": true`, `"type": "module"`. Scripts: `"build": "bun src/build.ts"`, `"fetch-upstream": "bun src/fetch-upstream.ts"`, `"typecheck": "tsc --noEmit"`, `"test": "bun test"`. Dev dependencies, exact: `typescript`, `@types/bun`. Dependencies, exact: `yaml`. Use the current latest versions at execution time, written without ranges.

- [ ] **Step 2: Create `tsconfig.json`**

`strict: true`, `noUncheckedIndexedAccess: true`, `module: "ESNext"`, `moduleResolution: "bundler"`, `target: "ESNext"`, `types: ["bun"]`, `noEmit: true`. Include `src`, `rules`, `test`, `adapters`.

- [ ] **Step 3: Create `.gitignore` and `LICENSE`**

`.gitignore`: `node_modules/`, `findings.md`. `LICENSE`: MIT, `Copyright (c) 2026 Luiz Filho`.

- [ ] **Step 4: Implement `src/fetch-upstream.ts`**

It clones `https://github.com/cursor/plugins` into a temp directory with `git clone --filter=blob:none --no-checkout`, then runs `git sparse-checkout set pstack` and `git checkout <sha>`. It deletes `upstream/pstack`, copies the checked-out `pstack/` there, and writes `upstream/UPSTREAM.json`, with `version` read from `pstack/.cursor-plugin/plugin.json` and `syncedAt` set to the ISO time. When the existing `UPSTREAM.json` already has the same `sha`, keep its `syncedAt`, so refetching an unchanged SHA leaves the tree byte-identical (sync.yml's "nothing changed" check depends on it). Use `Bun.spawn` for git.

- [ ] **Step 5: Fetch the first snapshot**

Run: `bun install && bun run fetch-upstream`
Expected: `upstream/pstack/skills/poteto-mode/SKILL.md` exists, and `upstream/UPSTREAM.json` has a 40-character `sha` and `version` `0.15.11` or later.

- [ ] **Step 6: Typecheck and commit**

Run: `bun run typecheck` → exits 0.

```bash
git add package.json bun.lock tsconfig.json .gitignore LICENSE src upstream
git commit -m "chore: scaffold build and vendor pstack snapshot

The port is generated from a pinned copy of upstream so every build is
reproducible and every sync shows up as a reviewable diff."
```

---

### Task 3: Lint (test-first) and the build pipeline

**Files:**
- Create: `test/lint.test.ts`, `src/lint.ts`, `src/load.ts`, `src/select.ts`, `src/frontmatter.ts`, `src/rewrite.ts`, `src/agents.ts`, `src/emit.ts`, `src/build.ts`
- Create (minimal stubs, filled in Task 4): `rules/drop.ts`, `rules/common.ts`, `rules/opencode.ts`, `rules/slugs.ts`, `rules/forbidden.ts`, `rules/allow.ts`

**Interfaces:**
- Consumes: the types from `src/types.ts` (Task 2).
- Produces:
  - `lint(input: { files: FileMap; hits: RuleHit[]; forbidden: Forbidden[]; allow: Allow[] }): Finding[]`. Findings are sorted by file, then line, then kind.
  - `formatFindings(findings: Finding[]): string`. Markdown: one bullet per finding, `` - `file:line` kind `pattern`: text ``.
  - `isText(bytes: Uint8Array): boolean`. False when the first 8192 bytes contain a NUL byte or the bytes aren't valid UTF-8.
  - `loadTree(root: string): Promise<FileMap>`
  - `select(files: FileMap, drop: string[]): FileMap`. `drop` holds `Bun.Glob` patterns.
  - `normalizeSkills(files: FileMap): FileMap`. For every `skills/<id>/SKILL.md`, sets `name: <id>` and removes `icon`, `color`, `mode`, `reminder` and `paths`.
  - `rewrite(files: FileMap, rules: Rule[]): { files: FileMap; hits: RuleHit[] }`. Text files only; `hits` has one entry per rule.
  - `convertAgents(files: FileMap, potetoMode: { reminder: string }): FileMap`. Replaces `agents/*.md` with the OpenCode agent files.
  - `emit(files: FileMap, outDir: string): Promise<void>`
  - `rules/*.ts` default exports: `drop: string[]`, `common: Rule[]`, `opencode: Rule[]`, `slugs: Record<Target, Record<string, string>>`, `forbidden: Forbidden[]`, `allow: Allow[]`
  - CLI: `bun run build [--report <path>]`. Exit 0 when the lint is clean. Otherwise print the findings to stderr, write them to `<path>` when `--report` is given, leave `dist/` untouched, and exit 1.

- [ ] **Step 1: Write the failing lint tests**

```ts
import { describe, expect, test } from "bun:test"
import { lint } from "../src/lint"

const forbidden = [{ id: "dot-cursor", pattern: /\.cursor\b/g }]
const files = (entries: Record<string, string>) => new Map(Object.entries(entries))

describe("lint", () => {
  test("reports a leftover forbidden term with file and line", () => {
    const out = lint({ files: files({ "a.md": "ok\nsee ~/.cursor/rules\n" }), hits: [], forbidden, allow: [] })
    expect(out).toEqual([
      { file: "a.md", line: 2, kind: "leftover", pattern: "dot-cursor", text: "see ~/.cursor/rules" },
    ])
  })

  test("an allow entry covers a leftover on that line only", () => {
    const out = lint({
      files: files({ "a.md": "worked at ~/.cursor once\n~/.cursor again\n" }),
      hits: [],
      forbidden,
      allow: [{ file: "a.md", text: "worked at ~/.cursor once" }],
    })
    expect(out.map((f) => [f.line, f.kind])).toEqual([[2, "leftover"]])
  })

  test("reports a rule that matched nothing", () => {
    const out = lint({ files: files({ "a.md": "clean\n" }), hits: [{ id: "task-tool", hits: 0 }], forbidden, allow: [] })
    expect(out).toEqual([{ file: "", line: 0, kind: "dead-rule", pattern: "task-tool", text: "" }])
  })

  test("reports an allow entry that matched nothing", () => {
    const out = lint({ files: files({ "a.md": "clean\n" }), hits: [], forbidden, allow: [{ file: "a.md", text: "gone" }] })
    expect(out).toEqual([{ file: "a.md", line: 0, kind: "dead-allow", pattern: "", text: "gone" }])
  })

  test("clean input yields no findings", () => {
    expect(lint({ files: files({ "a.md": "clean\n" }), hits: [{ id: "r", hits: 3 }], forbidden, allow: [] })).toEqual([])
  })
})
```

Binary entries (`Uint8Array`) in `files` are skipped by the leftover scan.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `bun test test/lint.test.ts`
Expected: FAIL, cannot resolve `../src/lint`.

- [ ] **Step 3: Implement `lint` and `formatFindings` in `src/lint.ts`**

Reset each `pattern.lastIndex` before scanning a line.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `bun test`
Expected: 5 pass, 0 fail.

- [ ] **Step 5: Implement the pipeline modules**

- `load.ts`: walk the root with `Bun.Glob("**/*").scan({ cwd, dot: true })`. Store text as `string` when `isText`, otherwise store the bytes.
- `frontmatter.ts`: split on the leading `---\n...\n---\n` block and parse it with `yaml`'s `parseDocument`. Edit the document and re-stringify it, so key order and quoting of untouched keys survive. Leave the body as is.
- `rewrite.ts`: apply rules in array order. A string `match` replaces every occurrence. Count hits per rule across all files.
- `agents.ts`: writes three files.
  - `agents/poteto-agent.md`: frontmatter `description` (from upstream) and `mode: subagent`; body from upstream.
  - `agents/comment-sicko.md`: frontmatter `description`, `mode: subagent`, and `permissions` denying `edit` and `shell` on resource `"*"`, in the list form from the OpenCode agents docs; body from upstream.
  - `agents/poteto.md`: frontmatter `description: "pstack's poteto-mode as an always-on agent"` and `mode: primary`. Body: `Load the \`poteto-mode\` skill with the skill tool at the start of the session, and apply it on every turn per this reminder:` followed by a blank line and the upstream `reminder` text.

  It removes the upstream `agents/poteto-agent.md` and `agents/comment-sicko.md` entries.
- `emit.ts`: delete `outDir`, then write every entry. Text is written as UTF-8 and bytes as-is.
- `build.ts`, in order: load `upstream/pstack` → `select(drop)` → read `reminder` from `skills/poteto-mode/SKILL.md` frontmatter → `normalizeSkills` → `rewrite([...common, ...opencode, ...slugRules])` → `convertAgents` → add `LICENSE` from upstream (it already is in the map; keep it) → copy every file under `adapters/opencode/` into the map → patch `package.json` in the map to set `version` and `pstack.upstreamSha` from `UPSTREAM.json` → `lint` → `emit("dist/opencode")`.

  `slugRules` are generated from `slugs.opencode`, one rule per entry with id `slug:<cursor-slug>` and a literal match. Order them longest key first, so `grok-4.7-xhigh-fast` is replaced before any shorter overlapping key.

- [ ] **Step 6: Fill the minimum rule stubs so the pipeline runs**

`drop.ts`: `["skills/make-bot-ui/**", "automations/**", ".cursor-plugin/**", "README.md"]`. All other rule files export empty arrays or objects for now. `adapters/opencode/` gets a placeholder `package.json`: `{ "name": "open-pstack-opencode", "version": "0.0.0", "type": "module" }`.

- [ ] **Step 7: Run the build and confirm the lint blocks it**

Run: `bun run build --report findings.md; echo "exit=$?"`
Expected: `exit=1`, `findings.md` lists `leftover` findings (dozens, including `subagent_type` and `.cursor`), and `dist/` does not exist.

- [ ] **Step 8: Check binary pass-through with the lint bypassed**

Temporarily run `forbidden = []` through a local edit, run `bun run build`, then:
`cmp upstream/pstack/assets/logo.png dist/opencode/assets/logo.png && cmp upstream/pstack/docs/guide/images/router.jpg dist/opencode/docs/guide/images/router.jpg && echo identical`
Expected: `identical`. Also run `bun run build` a second time and `git status --porcelain dist/` → empty. Revert the `forbidden` edit and delete `dist/`.

- [ ] **Step 9: Typecheck and commit**

Run: `bun run typecheck && bun test` → both exit 0.

```bash
git add src rules test adapters
git commit -m "feat: add rewrite pipeline and leftover-term lint

The lint is the only gate between upstream and installed skills, so it
is test-covered and fails the build on leftover Cursor terms, rules
that matched nothing, and allow entries that matched nothing."
```

---

### Task 4: OpenCode rewrite rules until the lint is clean

This is content work. Each replacement must read as a natural OpenCode instruction to a model. A blind token swap that leaves broken grammar doesn't count.

**Files:**
- Modify: `rules/common.ts`, `rules/opencode.ts`, `rules/slugs.ts`, `rules/forbidden.ts`, `rules/allow.ts`
- Create (generated): `dist/opencode/**` (without the adapter, which lands in Task 5)

**Interfaces:**
- Consumes: `Rule`, `Forbidden`, `Allow` and the `build` CLI from Task 3.

- [ ] **Step 1: Set `rules/forbidden.ts`**

| id | pattern |
|---|---|
| `dot-cursor` | `/\.cursor\b/g` |
| `cursor-word` | `/\bCursor\b/g` |
| `team-kit` | `/cursor-team-kit/g` |
| `subagent-type` | `/subagent_type/g` |
| `general-purpose` | `/generalPurpose/g` |
| `ask-question` | `/AskQuestion/g` |
| `task-tool` | `/\bTask tool\b\|\`Task\`/g` |
| `mdc` | `/\.mdc\b/g` |
| `cursor-api` | `/api2\.cursor\.sh/g` |
| `cursor-slug` | `/(?<![\w\/.-])(claude\|gpt\|grok)-[\w.-]*\d[\w.-]*/g` |
| `dropped-make-bot-ui` | `/make-bot-ui/g` |
| `dropped-benny` | `/automations\/benny/g` |

- [ ] **Step 2: Set `rules/slugs.ts` for `opencode`**

| Cursor slug | OpenCode ID |
|---|---|
| `claude-opus-5-5-max` | `anthropic/claude-opus-5-5#max` |
| `claude-opus-5-5-medium` | `anthropic/claude-opus-5-5#medium` |
| `gpt-5.6-sol-max` | `openai/gpt-5.6-sol#max` |
| `grok-4.7-xhigh-fast` | `opencode/grok-4.7#xhigh` |
| `grok-4.7-medium-fast` | `opencode/grok-4.7#medium` |

- [ ] **Step 3: Seed `rules/common.ts` and `rules/opencode.ts` from the spec table**

Start with one rule per row of the spec's "Initial rule coverage" table, with the OpenCode column as the replacement. Also add these rules, which the spec table implies:

- `setup-pstack` step 1 (scope: `skills/setup-pstack/SKILL.md`): replace the sentences about enumerating `Task` slugs and a Cursor models API with `Run \`opencode models\` to list the models available in this setup.`
- `setup-pstack` step 3(b) effort ladder: the effort token is the `#variant` suffix of a `provider/model#variant` ID, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. Its example sentence becomes: `So \`small\` turns \`anthropic/claude-opus-5-5#max\` into \`anthropic/claude-opus-5-5#medium\`, and \`opencode/grok-4.7#xhigh\` into \`opencode/grok-4.7#medium\`.`
- `setup-pstack` step 5: the rule shape's YAML frontmatter (`description`, `alwaysApply: true`) is removed. The file is plain Markdown that the pstack plugin loads into every session.
- Family wording in `arena` and `interrogate`: `Families go by prefix: \`claude-*\`, \`gpt-*\`, and \`grok-*\`` becomes `Families go by model name after the provider: \`claude-*\`, \`gpt-*\`, and \`grok-*\``.
- `poteto-mode` custom-mode wording (`poteto-help`, `poteto-mode`, `docs/guide/02-poteto-mode.md`): the option+enter custom-mode instructions become `switch to the \`poteto\` agent to keep poteto-mode on every turn`.
- The transcript lookup in `skills/poteto-mode/scripts/worktree-audit.sh`: replace the `transcripts=` block with a query for the newest session per worktree path, using `opencode api get "/api/session?directory=<path>&limit=1&order=desc"`. Before writing it, check that query's output shape with one real call.

Rules that only make sense for OpenCode (tool names, paths, the `question` tool, `agent:`/`background:` parameters) go in `opencode.ts`. Rules whose replacement is target-neutral prose (`/loop`, `create-skill`, `cursor-team-kit`, cloud agents, custom-mode wording when it doesn't name an OpenCode feature) go in `common.ts`.

- [ ] **Step 4: Iterate to a clean build**

Loop: `bun run build --report findings.md`. For each `leftover`, either add or extend a rule, or add an `allow` entry. Allow entries are only for legitimate mentions:
- poteto's bio line about working at Cursor (`docs/guide/*` if it appears there)
- the `gpt-4` / `gpt-4o` rename example in `skills/reflect/references/synthesizer.md`
- links to `cursor.com/docs/skills` when the sentence is about pstack's origin, not an instruction

For each `dead-rule`, narrow or delete the rule.
Expected end state: `bun run build` exits 0 and `dist/opencode/skills/poteto-mode/SKILL.md` exists.

- [ ] **Step 5: Review the generated text**

Read the full rewritten text of these files and fix any rule whose output reads wrong:
- `dist/opencode/skills/{poteto-mode,setup-pstack,arena,interrogate,swarm,how,why,reflect,recall,poteto-help}/SKILL.md`
- `dist/opencode/skills/poteto-mode/playbooks/{orchestrate,autonomous-run,shipping}.md`

Then check Review Focus item 5:
- `grep -rn "cursor" dist/opencode --include=bun.lock` should show the original `@cursor-skill/poteto-mode-tools` name unchanged.
- `grep -rn "cursor.com" dist/opencode` should show only allowed origin links.

- [ ] **Step 6: Commit**

Run: `bun run build && bun run typecheck && bun test` → all exit 0.

```bash
git add rules dist
git commit -m "feat: add OpenCode rewrite rules for pstack

Maps Cursor's Task tool, AskQuestion, model slugs, rule file, transcript
paths and custom mode to their OpenCode equivalents so the generated
skills read as native OpenCode instructions."
```

---

### Task 5: OpenCode adapter

**Files:**
- Create: `adapters/opencode/package.json`, `adapters/opencode/bun.lock`, `adapters/opencode/plugin.ts`, `adapters/opencode/README.md`
- Create (generated): updated `dist/opencode/**`

**Interfaces:**
- Consumes: the `dist/opencode/skills/<id>/SKILL.md` layout from Task 4 and the spike results from Task 1.
- Produces: the default export of `plugin.ts`, `Plugin.define({ id: "open-pstack", setup })`.

- [ ] **Step 1: Write `adapters/opencode/package.json` and the lockfile**

`{ "name": "open-pstack-opencode", "version": "0.0.0", "type": "module", "main": "plugin.ts", "dependencies": { "@opencode/plugin": "2.0.23", "yaml": "<same exact version as root>" }, "pstack": { "upstreamSha": "" } }`

Run `bun install` in `adapters/opencode/` to produce `bun.lock`, then delete `adapters/opencode/node_modules`. Add `adapters/opencode/node_modules/` to `.gitignore`.

- [ ] **Step 2: Implement `plugin.ts`**

In `setup(ctx)`:
- **Skills.** Glob `skills/*/SKILL.md` relative to `import.meta.dir`. For each file, parse the frontmatter with `yaml`. Call `ctx.skill.transform` once, adding `{ id: <dir>, name: <dir>, description, autoinvoke: data["disable-model-invocation"] !== true, path: <absolute SKILL.md path>, content: <body> }`.
- **Commands.** Call `ctx.command.transform` once, adding `{ name: <id>, description, execute }` per skill. `execute` calls `ctx.session.prompt` with the shape that the Task 1 spike proved.
- **Model rule.** Register `ctx.session.hook("context", …)`. When `~/.config/opencode/pstack-models.md` exists (`Bun.file(path).exists()`), the hook reads it and pushes `{ type: "text", text }` onto `event.system`. Read the file on every call, so `/setup-pstack` edits apply without a restart.

- [ ] **Step 3: Write `adapters/opencode/README.md`**

Contents:
- one paragraph on what this is, crediting pstack by Lauren Tan with the upstream link
- the install config: the `plugins` entry with the `dist/opencode` path, `bun install --frozen-lockfile`, and the agent symlinks
- the `pstack-models.md` location
- that `/setup-pstack` writes it

Apply the unslop skill.

- [ ] **Step 4: Build and confirm the adapter is in `dist/`**

Run: `bun run build && jq '{version, pstack}' dist/opencode/package.json`
Expected: `version` equals `UPSTREAM.json`'s `version`, and `pstack.upstreamSha` equals its `sha`.

- [ ] **Step 5: Load the real plugin in OpenCode**

Run: `cd dist/opencode && bun install --frozen-lockfile`. Create `/tmp/opencode/pstack-check/opencode.json` with `"plugins": ["<repo>/dist/opencode"]`, and symlink `dist/opencode/agents/*.md` into `/tmp/opencode/pstack-check/.opencode/agents/`.

Run in that directory, using the invocation form that Task 1 confirmed: `opencode api get /api/command` and `opencode api get /api/skill`
Expected (Review Focus 2):
- the commands include `poteto-mode`, `how`, `setup-pstack` and `poteto-help`, and none named `make-bot-ui`
- the skill list includes `poteto-mode`
- `opencode api get /api/agent` (or the equivalent) lists `poteto`, `poteto-agent` and `comment-sicko`

- [ ] **Step 6: Check the model rule both ways (Review Focus 3)**

With no `~/.config/opencode/pstack-models.md`, run `opencode run "/poteto-help what is pstack"`. Expected: a normal answer with no plugin error in `~/.local/share/opencode/log/opencode.log`.

Then write `~/.config/opencode/pstack-models.md` containing `swarm workers: opencode/grok-4.7#xhigh` and run `opencode run "What model does your pstack rule set for swarm workers? Answer with the ID only."`. Expected: `opencode/grok-4.7#xhigh`. Delete the file afterwards.

- [ ] **Step 7: Commit**

Run: `bun run build && bun run typecheck && bun test && git status --porcelain dist/` → the last command prints nothing new after `git add`.

```bash
git add adapters .gitignore dist
git commit -m "feat: add OpenCode plugin adapter

Registers every pstack skill, a slash command per skill so upstream's
/poteto-mode style text works unchanged, and loads pstack-models.md into
each session the way Cursor's always-applied rule did."
```

---

### Task 6: CI and Renovate

**Files:**
- Create: `.github/workflows/ci.yml`, `renovate.json`

- [ ] **Step 1: Write `ci.yml`**

Triggers: `pull_request`, plus `push` to `main`. One job, `ci`, on `ubuntu-latest`. Steps:
1. `actions/checkout@v4`
2. `oven-sh/setup-bun@v2` with `bun-version: 1.4.2`
3. `bun install --frozen-lockfile`
4. `bun run typecheck`
5. `bun test`
6. `bun run build`
7. `git diff --exit-code dist/`
8. `bun install --frozen-lockfile --cwd adapters/opencode`

Step 8 catches an adapter lockfile that Renovate left out of date.

- [ ] **Step 2: Write `renovate.json`**

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "rangeStrategy": "pin",
  "packageRules": [
    { "matchPackageNames": ["@opencode/plugin"], "automerge": true }
  ]
}
```

- [ ] **Step 3: Validate locally**

Run: `bunx --bun renovate-config-validator renovate.json && bunx actionlint .github/workflows/ci.yml`
Expected: both report no errors. If `actionlint` isn't available through bunx, use `mise exec actionlint -- actionlint`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml renovate.json
git commit -m "ci: check typecheck, lint test, build and dist freshness

A stale dist/ or a hand edit to generated files fails CI, so main
always matches what the rules produce from the pinned snapshot."
```

---

### Task 7: Sync workflow and GitHub setup

**Files:**
- Create: `.github/workflows/sync.yml`

- [ ] **Step 1: Write `sync.yml`**

Triggers:
- `schedule: [{ cron: "17 6 * * 1" }]`
- `workflow_dispatch`
- `push` to `main` with `paths: ["rules/**", "src/**", "adapters/**"]`

Use `concurrency: sync` with `cancel-in-progress: false`. Use `GH_TOKEN: ${{ secrets.SYNC_TOKEN }}` throughout, and `actions/checkout@v4` with `token: ${{ secrets.SYNC_TOKEN }}` and `fetch-depth: 0`. Steps:
1. Set up Bun 1.4.2 and run `bun install --frozen-lockfile`.
2. `latest=$(gh api 'repos/cursor/plugins/commits?path=pstack&per_page=1' --jq '.[0].sha')`. If `latest` equals `jq -r .sha upstream/UPSTREAM.json` and `github.event_name` is `schedule` or `workflow_dispatch`, stop with success.
3. Run `git checkout -B sync/upstream origin/main`, then `bun run fetch-upstream "$latest"`.
4. Run `bun run build --report findings.md` and keep its exit code.
5. **Build passed.** Run `git add upstream dist`.
   - If `git diff --cached --quiet` reports nothing staged, close any open PR from `sync/upstream` with `gh pr close sync/upstream --delete-branch` and stop.
   - Otherwise commit with the message `sync: pstack <version> (<short sha>)` and run `git push -f origin sync/upstream`. Open the PR if none exists (`gh pr create --head sync/upstream --base main --title … --body …`), or update its title and body with `gh pr edit`. Then run `gh pr edit --remove-label sync-held` and `gh pr merge sync/upstream --auto --squash`.
6. **Build failed.** Run `git add upstream`, commit the snapshot with the same message, and force-push. Open or update the PR with a body that starts `Held: the rewrite lint found Cursor terms no rule covers.` followed by `findings.md`. Then run `gh pr edit --add-label sync-held` and `gh pr merge sync/upstream --disable-auto`. Ignore the error when auto-merge wasn't enabled.

Create the `sync-held` label in the workflow with `gh label create sync-held --force`.

- [ ] **Step 2: Lint the workflow**

Run: `bunx actionlint .github/workflows/sync.yml` (or `mise exec actionlint -- actionlint`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync.yml
git commit -m "ci: add weekly upstream sync with held-PR on lint failure

Upstream changes land without manual porting when the rules cover them.
When they don't, the snapshot waits in a labeled PR listing the leftover
terms and main keeps the last good build."
```

- [ ] **Step 4: GitHub setup (ask the user before each irreversible or account-level action)**

1. Ask the user whether the repo should be public or private. Create it with `gh repo create luizbafilho/open-pstack --<visibility> --source . --push`.
2. Ask the user to create a fine-grained PAT for this repo only (contents: read/write, pull requests: read/write), then run `gh secret set SYNC_TOKEN` interactively.
3. Run `gh repo edit --enable-auto-merge --delete-branch-on-merge`.
4. Protect `main`, requiring the `ci` check, with `gh api -X PUT repos/luizbafilho/open-pstack/branches/main/protection` and a JSON body containing `required_status_checks: { strict: false, contexts: ["ci"] }`, `enforce_admins: false`, `required_pull_request_reviews: null` and `restrictions: null`.
5. Ask the user to install the Renovate GitHub app on the repo.

- [ ] **Step 5: Exercise the workflow (Review Focus 4)**

Run `gh workflow run sync.yml`, then `gh run watch`.
Expected: success with no PR opened, because the snapshot is current.

Run it a second time. Expected: the same, and `gh pr list --head sync/upstream` is empty.

To exercise a real sync, run `bun run fetch-upstream <the commit before UPSTREAM.json's sha under pstack/>` locally, then `bun run build`. Commit and push that older snapshot to `main` in a PR and let it merge. Then run `gh workflow run sync.yml`. Expected: a PR `sync: pstack …` opens, `ci` passes, and it auto-merges.

---

### Task 8: Delivery through dotfiles

Work happens in `~/.dotfiles` (its own repo, default branch pulled first). Follow its `AGENTS.md`. Never edit anything under `~/.config/` directly.

**Files:**
- Modify: `opencode/config/opencode.json` (the `plugins` array)
- Modify: the `dotctl bootstrap opencode` implementation, located by `grep -rn "bootstrap opencode\|func.*[Oo]pencode" dotctl`
- Create: `systemd/user/open-pstack-update.service`, `systemd/user/open-pstack-update.timer`
- Modify: `mise.linux.toml`, the `linux:units` loop, to enable `open-pstack-update.timer`

- [ ] **Step 1: Extend the OpenCode bootstrap**

It must:
- clone `https://github.com/luizbafilho/open-pstack` to `~/.local/share/open-pstack`, or `git pull --ff-only` when the clone exists
- run `bun install --frozen-lockfile` in `dist/opencode`
- symlink each `dist/opencode/agents/*.md` into the generated `~/.config/opencode/agents/` tree

Follow the existing dotctl pattern for generated files.

- [ ] **Step 2: Add the plugin path**

Append `"~/.local/share/open-pstack/dist/opencode"` to `plugins` in `opencode/config/opencode.json`. If Task 1 showed that `~` isn't expanded in plugin paths, use the expansion mechanism dotctl already applies to that file.

- [ ] **Step 3: Add the timer**

`open-pstack-update.service`:
- `Type=oneshot`
- `ExecStart=/bin/sh -c 'cd %h/.local/share/open-pstack && git pull --ff-only && cd dist/opencode && bun install --frozen-lockfile'`
- if Task 1 found that a path plugin needs a restart, add `ExecStartPost=opencode service restart`

`open-pstack-update.timer`:
- `OnCalendar=Mon 09:00`
- `Persistent=true`
- `WantedBy=timers.target`

Link both units the way `systemd/user/README.md` describes, and add the timer to the `linux:units` loop.

- [ ] **Step 4: Run the bootstrap and verify**

Run: `mise run bootstrap:opencode && mise run linux:units`
Expected:
- `opencode api get /api/command` lists `poteto-mode`
- `systemctl --user list-timers open-pstack-update.timer` shows the next Monday 09:00
- `systemctl --user start open-pstack-update.service && systemctl --user status open-pstack-update.service` ends in `status=0/SUCCESS`

- [ ] **Step 5: Commit in the dotfiles repo**

```bash
git add opencode/config/opencode.json systemd/user/open-pstack-update.* mise.linux.toml dotctl
git commit -m "feat(opencode): install open-pstack and refresh it weekly

open-pstack ports pstack to OpenCode and syncs upstream weekly. This
installs it as a path plugin and pulls new builds on a Monday timer so
new sessions pick them up without a manual step."
```
