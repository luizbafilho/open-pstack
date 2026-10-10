import { roleByLine, seats } from "../src/roles"
import type { Rule } from "../src/types"
import roles from "./roles"

const configFile = "`~/.omp/agent/pstack.yml`"
const bucket =
  'where `<bucket>` is the workspace path relative to your home directory with each "/" turned into "-" (so `~/work/proj` becomes `-work-proj`)'
const sessionsDir = "`~/.omp/agent/sessions/<bucket>/`"
const roleNote = `omp picks each agent's model from its \`modelRoles\` key in ${configFile}, which \`/setup-pstack\` writes, and falls back to the agent's default.`

const agentFor = (line: string): string => {
  const [seat] = seats(roleByLine(line))
  return seat!.agent
}

const seatRange = (line: string): string => {
  const all = seats(roleByLine(line))
  return `\`${all[0]!.agent}\` to \`${all.at(-1)!.agent}\``
}

const seatPick = `Run the seats that have a \`modelRoles\` key in ${configFile}, or all of them when none has one.`

function setupShape(): string {
  const lines = roles.flatMap((role) => [
    `  # ${role.line}`,
    ...seats(role).map((seat) => `  ${seat.key}: ${seat.default}`),
  ])
  return [
    "```yaml",
    "# pstack model configuration, written by /setup-pstack. Delete a key to fall back to that agent's default.",
    "# budget: unlimited (max)",
    "modelRoles:",
    ...lines,
    "task:",
    "  maxRecursionDepth: 3",
    "  isolation:",
    "    enabled: true",
    "```",
  ].join("\n")
}

const omp: Rule[] = [
  // Role agents: omp's task tool has no per-call model, so each role is an agent.
  {
    id: "role-preamble",
    match:
      /(Each spawn below names|Each reviewer and the synthesizer name) a role line in the `pstack-models\.mdc` rule and a default\. Set `model` to that line's value, or to the default if the rule or the line is missing\. Leave `model` unset when the value is `auto` or `inherit-parent`\. If the Task tool rejects a slug, use the default and say so\. If it rejects the default, use the closest valid slug of the same family from its error message\./g,
    replace: (_m, who: string) => `${who} a pstack agent. ${roleNote}`,
  },
  {
    id: "role-list",
    match: /- `subagent_type`: `generalPurpose`\n- `model`: the `([^`]+)` line, default `[^`]+`\n- `readonly`: [^\n]*\n/g,
    replace: (_m, line: string) => `- \`agent\`: \`${agentFor(line)}\`\n`,
  },
  {
    id: "role-poteto-mode-defaults",
    files: "skills/poteto-mode/SKILL.md",
    match:
      "`run_in_background: true`, agent mode (readonly strips MCP), file pointers not inlined context, explicit model per role (configurable via `/setup-pstack`.",
    replace: "file pointers not inlined context, one role agent per role (models configurable via `/setup-pstack`.",
  },
  {
    id: "role-poteto-mode-lines",
    files: "skills/poteto-mode/SKILL.md",
    match: /Per-role lines in the `\/setup-pstack` rule override these defaults[^\n]*Prose and judgment read `judgment and prose`\./g,
    replace:
      "Pick the agent, not a model: `poteto-agent-feature` (feature and refactoring), `poteto-agent-bug-fix`, `poteto-agent-perf-issue`, and `poteto-agent-hillclimb` for their playbooks, `poteto-agent-hardest` for the hardest changes, and `poteto-agent-judgment` for prose and judgment. Plain `poteto-agent` runs on the parent chat model. The routed skills (`how`, `why`, `arena`, `swarm`, `architect`, `interrogate`, `reflect`) name their own `pstack-*` agents. `/setup-pstack` sets every agent's model, and a role with no key keeps its default.",
  },
  {
    id: "role-playbook-delegate",
    match: /a subagent using your configured (feature|refactoring|bug-fix|perf-issue|hillclimb) model \(default `[^`]+`\)/g,
    replace: (_m, role: string) => `a \`poteto-agent-${role === "refactoring" ? "feature" : role}\` subagent`,
  },
  {
    id: "role-multi-phase-explore",
    files: "skills/poteto-mode/playbooks/multi-phase-plan.md",
    match: 'with `subagent_type: "poteto-agent"` and an explicit model per the Subagents section',
    replace: "with the `poteto-agent` variant the Subagents section names for the role",
  },
  {
    id: "role-reflect-reviewers",
    files: "skills/reflect/SKILL.md",
    match:
      "One message, three `Task` calls, `subagent_type: generalPurpose`, with `model` set as below, agent mode (`readonly: false`). Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Readonly strips MCPs.",
    replace:
      "One `task` call with three tasks, each on the agent below. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript), and these agents have it.",
  },
  {
    id: "role-reflect-table-header",
    files: "skills/reflect/SKILL.md",
    match: "| Lens | Role line | Default `model` | Prompt template |\n|---|---|---|---|",
    replace: "| Lens | Agent | Prompt template |\n|---|---|---|",
  },
  {
    id: "role-reflect-table-rows",
    files: "skills/reflect/SKILL.md",
    match: /^\| (Judgment|Tooling|Divergent) \| `([^`]+)` \| `[^`]+` \| (`[^`]+`) \|$/gm,
    replace: (_m, lens: string, line: string, template: string) => `| ${lens} | \`${agentFor(line)}\` | ${template} |`,
  },
  {
    id: "role-reflect-synthesizer",
    files: "skills/reflect/SKILL.md",
    match:
      "One `Task` call, `subagent_type: generalPurpose`, with `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-max`), agent mode (`readonly: false`). The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Readonly strips MCPs.",
    replace: `One \`task\` call on \`${agentFor("reflect judgment, divergent, synthesizer")}\`. The synthesizer's quality check includes spot-verifying citations, which can require MCP access, and that agent has it.`,
  },
  {
    id: "role-arena-runners",
    files: "skills/arena/SKILL.md",
    match:
      /Pick the runners\. Use the `arena runners` line in `~\/\.cursor\/rules\/pstack-models\.mdc`\. If the rule or that line is missing, default to one each on (`[^`]+`, `[^`]+`, `[^`]+`)\.[^\n]*?use the closest valid slug of the same family from its error message\./g,
    replace: (_m, defaults: string) =>
      `Pick the runners: the ${seatRange("arena runners")} agents, whose defaults are ${defaults}. ${seatPick}`,
  },
  {
    id: "role-arena-fan-out",
    files: "skills/arena/SKILL.md",
    match: "Spawn all N subagents in one message with `run_in_background: true`, each with the task,",
    replace: "Spawn all N subagents in one `task` call, each with the task,",
  },
  {
    id: "role-arena-judge",
    files: "skills/arena/SKILL.md",
    match:
      /choose one model from the `arena cross-judge pool` line in `~\/\.cursor\/rules\/pstack-models\.mdc`\. If the rule or that line is missing, choose from (`[^`]+`, `[^`]+`, `[^`]+`)\. Prefer a different model family from the parent's\. Spawn one readonly judge subagent on that model\./g,
    replace: (_m, defaults: string) =>
      `choose one of the ${seatRange("arena cross-judge pool")} agents. Their models are their \`modelRoles\` keys in ${configFile}, or ${defaults} when unset. Prefer one whose provider differs from the parent's. Spawn that one read-only judge.`,
  },
  {
    id: "role-architect-runners",
    files: "skills/architect/SKILL.md",
    match:
      /Take the runners from the `architect runners` line in the `pstack-models\.mdc` rule, in place of the `arena runners` line\. If the rule or that line is missing, use (`[^`]+`, `[^`]+`, `[^`]+`)\. Alias and rejected entries follow the runner rules in the \*\*arena\*\* skill's Phase A\./g,
    replace: (_m, defaults: string) =>
      `Run the ${seatRange("architect runners")} agents in place of the arena runners, picking seats as the **arena** skill's Phase A does. Their defaults are ${defaults}.`,
  },
  {
    id: "role-interrogate-launch",
    files: "skills/interrogate/SKILL.md",
    match:
      "Launch all reviewers in a single message using the Task tool. Use the `interrogate reviewers` line in `~/.cursor/rules/pstack-models.mdc`, one reviewer per entry, extending or shrinking the Reviewer A/B/C labels below to the configured entry count. If the rule or that line is missing, use the table defaults.",
    replace: `Launch all reviewers in one \`task\` call. Reviewers A, B and C run as ${seatRange("interrogate reviewers")}. ${seatPick} The table lists each seat's default model.`,
  },
  {
    id: "role-interrogate-list",
    files: "skills/interrogate/SKILL.md",
    match:
      "- `subagent_type`: `generalPurpose`\n- `model`: the configured `interrogate reviewers` entry, or the table default with no configured line. For an `auto` or `inherit-parent` entry, omit `model` so that reviewer runs on the parent model.\n- `readonly`: `true`\n",
    replace: "- `agent`: that reviewer's seat agent\n",
  },
  {
    id: "role-interrogate-rejected",
    files: "skills/interrogate/SKILL.md",
    match: /If the Task tool rejects a configured entry, run that reviewer on the table default of its family and say so\.[^\n]*Never treat an alias entry as a rejected slug or apply either fallback to it\./g,
    replace: "Do not block the review on a model problem. Report it and run the remaining seats.",
  },
  {
    id: "role-swarm-model",
    files: "skills/swarm/SKILL.md",
    match:
      /Pick the worker model from the `swarm workers` line in `~\/\.cursor\/rules\/pstack-models\.mdc`\.[^\n]*For a model race, name each arm's model up front\./g,
    replace: `Workers run as \`${agentFor("swarm workers")}\`, whose model is its \`modelRoles\` key in ${configFile}. For a model race, run each arm on a different ${seatRange("arena runners")} seat and name each arm's seat up front.`,
  },
  {
    id: "role-swarm-spawn",
    files: "skills/swarm/SKILL.md",
    match:
      'Spawn all N workers in one message with `subagent_type: generalPurpose`, `environment: "cloud"`, `run_in_background: true`, and the step 4 model, left unset for `auto` or `inherit-parent`. Use `environment: "local"` only when the worker needs access to something on the user\'s computer.',
    replace: `Spawn all N workers in one \`task\` call on \`${agentFor("swarm workers")}\` (or the race seats), with \`isolated: true\` on every worker that writes. omp gives each isolated worker its own copy of the checkout and captures its changes as a patch.`,
  },
  {
    id: "role-orchestrate-nesting",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match: "(nesting works to depth 3, and a nested spawn has the full Task schema including `environment`)",
    replace: `(nesting works to depth 3 with \`task.maxRecursionDepth: 3\`, which ${configFile} sets. A nested spawn has the full \`task\` schema, including \`isolated\`)`,
  },

  // Remaining subagent types.
  {
    id: "agent-poteto-agent-description",
    files: "agents/poteto-agent.md",
    match: "Substituting `generalPurpose` skips that read and drifts.",
    replace: "Substituting the bundled `task` agent skips that read and drifts.",
  },
  {
    id: "agent-comment-sicko-spawn",
    files: "skills/no-comments/SKILL.md",
    match: 'Spawn `Task` with `subagent_type: "Comment Sicko"`.',
    replace: 'Call the `task` tool with `agent: "comment-sicko"`.',
  },
  {
    id: "agent-poteto-agent",
    match: 'subagent_type: "poteto-agent"',
    replace: 'agent: "poteto-agent"',
  },
  {
    id: "agent-own-type",
    files: "skills/poteto-mode/SKILL.md",
    match: "set their own `subagent_type`",
    replace: "set their own `agent`",
  },

  // Cursor's Task tool: omp's task tool.
  {
    id: "task-one-subagent",
    match: /\bone Task subagent\b/g,
    replace: "one subagent",
  },
  {
    id: "task-the-tool",
    match: /\bthe Task tool\b/g,
    replace: "the `task` tool",
  },
  {
    id: "task-response-body",
    files: "skills/reflect/SKILL.md",
    match: "in the `Task` response body",
    replace: "in the `task` result",
  },
  {
    id: "task-backticked",
    match: "`Task`",
    replace: "`task`",
  },

  // AskQuestion: omp's ask tool.
  {
    id: "ask-question-tool",
    match: "the `AskQuestion` tool",
    replace: "the `ask` tool",
  },
  {
    id: "ask-question-about-to",
    files: "skills/poteto-mode/SKILL.md",
    match: "About to `AskQuestion` on",
    replace: "About to use the `ask` tool on",
  },
  {
    id: "ask-question-prefer",
    files: "skills/setup-pstack/SKILL.md",
    match: "Prefer AskQuestion over free text.",
    replace: "Prefer the `ask` tool over free text.",
  },
  {
    id: "ask-question-verb",
    match: /\b(with|use) `AskQuestion`/g,
    replace: "$1 the `ask` tool",
  },

  // setup-pstack: the pstack.yml overlay.
  {
    id: "setup-description",
    files: "skills/setup-pstack/SKILL.md",
    match: "writes an always-applied rule that overrides the skill defaults.",
    replace: `writes ${configFile}, the config overlay that sets each pstack agent's model.`,
  },
  {
    id: "setup-intro",
    files: "skills/setup-pstack/SKILL.md",
    match: "`~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role.",
    replace: `${configFile}, a config overlay that sets the model of every pstack agent through \`modelRoles\`.`,
  },
  {
    id: "setup-detect-models",
    files: "skills/setup-pstack/SKILL.md",
    match:
      "Enumerate the model slugs you can pass to a `task` subagent in this session. That is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness.",
    replace:
      "Run `omp models` to list the models available in this setup, grouped by provider. A selector is `provider/model:effort`, and the `thinking` column lists the efforts each model accepts.",
  },
  {
    id: "setup-retired-roles",
    files: "skills/setup-pstack/SKILL.md",
    match: "A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.",
    replace: "A `pstack-*` key that is not in step 5 is from a retired role. Drop it.",
  },
  {
    id: "setup-effort-token",
    files: "skills/setup-pstack/SKILL.md",
    match: "The effort token is the last token, or the one before a trailing `fast`, on the ladder",
    replace: "The effort token is the `:effort` suffix of a selector, on the ladder",
  },
  {
    id: "setup-aliases",
    files: "skills/setup-pstack/SKILL.md",
    match: "(both mean: this role runs on the parent chat model, which is how Auto users stay on Auto)",
    replace: '(both mean: this role runs on the parent chat model, and step 5 writes them as `"@default"`)',
  },
  {
    id: "setup-panel-count",
    files: "skills/setup-pstack/SKILL.md",
    match: "so the list length sets the count.",
    replace: "so the list length sets the count, up to three, one per seat agent.",
  },
  {
    id: "setup-heading",
    files: "skills/setup-pstack/SKILL.md",
    match: "### 5. Write the rule",
    replace: "### 5. Write the overlay",
  },
  {
    id: "setup-default-shape",
    files: "skills/setup-pstack/SKILL.md",
    match: "is the rule shape shown in step 5",
    replace: "is the file shape shown in step 5",
  },
  {
    id: "setup-budget-record",
    files: "skills/setup-pstack/SKILL.md",
    match: "when the rule records one.",
    replace: "when the file records one.",
  },
  {
    id: "setup-help-writes",
    files: "skills/poteto-help/SKILL.md",
    match: "and writes a rule. The rule applies to new chats.",
    replace: `and writes ${configFile}. It applies to the next subagent spawn.`,
  },
  {
    id: "setup-help-no-effect",
    files: "skills/poteto-help/SKILL.md",
    match: "| The rule from `/setup-pstack` applies to new chats. Start one. |",
    replace: `| omp reads ${configFile} only when \`PI_CONFIG_FILES\` lists it. Check that variable. |`,
  },
  {
    id: "setup-guide-new-chat",
    files: "docs/guide/01-setup.md",
    match: "After setup, start a new chat. The model rule applies to new sessions.",
    replace: "Model changes apply to the next subagent spawn, with no restart.",
  },
  {
    id: "setup-write",
    files: "skills/setup-pstack/SKILL.md",
    match: /Write `~\/\.cursor\/rules\/pstack-models\.mdc` with `alwaysApply: true`[^\n]*\n\n```\n[\s\S]*?\n```/g,
    replace: () =>
      `Write ${configFile}: a \`# budget\` comment with the chosen label and its target effort, one \`modelRoles\` key per role, and the two \`task\` settings pstack's playbooks need. A panel role gets one key per entry, numbered from \`-1\`. Write \`inherit-parent\` and \`auto\` as \`"@default"\`, which resolves to the parent chat model. Overwrite the whole file so re-runs stay idempotent. If the path is a symlink, write through it rather than replacing it. Shape:\n\n${setupShape()}`,
  },
  {
    id: "setup-confirm",
    files: "skills/setup-pstack/SKILL.md",
    match: "Tell the user the rule was written and that it applies to new sessions.",
    replace: `Tell the user ${configFile} was written and that it applies to the next subagent spawn. Check \`$PI_CONFIG_FILES\`. If it doesn't list that file, tell the user to add it to their shell environment, because omp reads the overlay only through that variable.`,
  },
  {
    id: "setup-guide-writes",
    files: "docs/guide/01-setup.md",
    match: "It writes `~/.cursor/rules/pstack-models.mdc`, a small rule every pstack skill reads.",
    replace: `It writes ${configFile}, a config overlay that sets the model of every pstack agent. omp loads it through \`PI_CONFIG_FILES\`, as the [README](../../README.md) shows.`,
  },
  {
    id: "setup-guide-overrides",
    files: "docs/guide/01-setup.md",
    match: /You only override what you care about\. A role with no line in the rule keeps the skill's default\.[^\n]*\n\nYou might be wondering what happens if you use Auto\.[^\n]*/g,
    replace:
      'You only override what you care about. A role with no key keeps its agent\'s default model. To restore a default, delete that key. A rerun of `/setup-pstack` keeps any role whose model differs from the default.\n\nSet a role to `inherit-parent` or `auto` and setup writes it as `"@default"`, so that agent runs on your parent chat model. For a panel role the value is a list of up to three entries, one per seat agent, so the list length sets the panel size. Setup also configures `swarm workers`, the model for every `/swarm` worker.',
  },
  {
    id: "models-path",
    match: "`~/.cursor/rules/pstack-models.mdc`",
    replace: configFile,
  },

  // Skill directories.
  {
    id: "skills-reflect-read-calls",
    files: "skills/reflect/references/*.md",
    match:
      "- `Read` tool calls against any `SKILL.md` file (workspace `.cursor/skills/`, user-level `~/.cursor/skills/`, or plugin-installed paths under `~/.cursor/plugins/`)",
    replace:
      "- `read` tool calls against any `SKILL.md` file or `skill://` URL (workspace `.omp/skills/`, user-level `~/.omp/agent/skills/`, or a plugin's directory under `~/.omp/plugins/`)",
  },
  {
    id: "skills-user-dir",
    match: "~/.cursor/skills/",
    replace: "~/.omp/agent/skills/",
  },
  {
    id: "skills-project-dir",
    match: ".cursor/skills/",
    replace: ".omp/skills/",
  },

  // Transcripts: omp's session JSONL files.
  {
    id: "transcripts-recall-location",
    files: "skills/recall/SKILL.md",
    match:
      'Transcripts live at `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, where `<slug>` is the workspace path with the leading slash dropped and each "/" turned into "-" (so `/Users/you/proj` becomes `Users-you-proj`). Every line is one chat message.',
    replace: `Transcripts live at \`~/.omp/agent/sessions/<bucket>/<timestamp>_<uuid>.jsonl\`, ${bucket}. Every line is one JSON entry. Chat messages are the \`"type":"message"\` entries, after a title line and the session header.`,
  },
  {
    id: "transcripts-system-prompt",
    match: /The system prompt names the (?:active )?workspace's `agent-transcripts\/` directory\. Use (?:only )?that path\./g,
    replace: `This workspace's sessions are the \`.jsonl\` files in ${sessionsDir}, ${bucket}. Use only that directory.`,
  },
  {
    id: "transcripts-reflect-candidates",
    files: "skills/reflect/SKILL.md",
    match:
      /```bash\nls -t <agent-transcripts>[^\n]*\n```\n\nThree transcript layouts:[^\n]*\n\nFor each candidate, read the first JSONL line and check that `message\.content\[0\]\.text` contains the conversation's opening user prompt\./g,
    replace:
      '```bash\nls -t ~/.omp/agent/sessions/<bucket>/*.jsonl | head -10\n```\n\nFor each candidate, find the first `"type":"message"` entry with `"role":"user"` and check that its text contains the conversation\'s opening user prompt.',
  },
  {
    id: "transcripts-session-pickup",
    files: "skills/poteto-mode/playbooks/session-pickup.md",
    match:
      "A local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names the path. Do not glob across `~/.cursor/projects/*/`, that crosses workspace boundaries and reads private chats from unrelated projects)",
    replace: `A prior session in the active workspace (the \`.jsonl\` files in ${sessionsDir}, ${bucket}. Never read another bucket, that crosses workspace boundaries and reads private chats from unrelated projects)`,
  },
  {
    id: "transcripts-under-directory",
    match: /transcript under the active workspace's `agent-transcripts\/` directory \(the system prompt names (?:this|the) path\)/g,
    replace: `session file in ${sessionsDir} (${bucket})`,
  },
  {
    id: "transcripts-no-glob",
    match: /Do(?:n't| not) glob across `~\/\.cursor\/projects\/\*\/`/g,
    replace: "Never read another session bucket",
  },
  {
    id: "transcripts-worktree-audit-dir",
    files: "skills/poteto-mode/scripts/worktree-audit.sh",
    match:
      '# Transcripts dir: ~/.cursor/projects/<slugified-repo-path>/agent-transcripts.\nslug=$(printf \'%s\' "$main_wt" | sed \'s#^/##; s#/#-#g\')\ntranscripts="$HOME/.cursor/projects/$slug/agent-transcripts"\n',
    replace:
      '# omp sessions: ~/.omp/agent/sessions/<bucket>, where <bucket> is a\n# working directory relative to $HOME with each "/" turned into "-".\nsessions="$HOME/.omp/agent/sessions"\n',
  },
  {
    id: "transcripts-worktree-audit-lookup",
    files: "skills/poteto-mode/scripts/worktree-audit.sh",
    match:
      '\t# Most recent chat whose transcript operated in this worktree. Match path\n\t# followed by "/" or a quote so glint-482 does not match glint-482-r37.\n\tlast="-"; last_ts=0\n\tif [ -d "$transcripts" ]; then\n\t\tf=$(rg -l -e "${wt}/" -e "${wt}\\"" "$transcripts" 2>/dev/null \\\n\t\t\t| xargs stat -f \'%m %N\' 2>/dev/null | sort -rn | head -1)\n\t\tif [ -n "$f" ]; then last_ts=$(echo "$f" | awk \'{print $1}\')\n\t\t\tlast=$(date -r "$last_ts" \'+%Y-%m-%d\' 2>/dev/null); fi\n\tfi\n',
    replace:
      '\t# Most recent omp session started in this worktree.\n\tlast="-"; last_ts=0\n\tf=$(ls -t "$sessions/$(printf \'%s\' "${wt#"$HOME"}" | sed \'s#/#-#g\')"/*.jsonl 2>/dev/null | head -1)\n\tif [ -n "$f" ]; then last_ts=$(stat -f \'%m\' "$f" 2>/dev/null || echo 0)\n\t\tlast=$(date -r "$last_ts" \'+%Y-%m-%d\' 2>/dev/null); fi\n',
  },

  // Worktree and disk paths.
  {
    id: "paths-worktree-cleanup-location",
    files: "skills/poteto-mode/playbooks/worktree-cleanup.md",
    match: "misses one that lives at `.cursor/worktrees/myrepo/x`",
    replace: "misses one that lives outside the repo directory",
  },
  {
    id: "paths-worktree-cleanup-app-support",
    files: "skills/poteto-mode/playbooks/worktree-cleanup.md",
    match:
      "`~/Library/Application Support/Cursor` (`state.vscdb.backup`, and `snapshots/roots/<root>` where a `<root>` named for a folder you opened as a workspace balloons),",
    replace: "omp's `~/.omp/agent/sessions/` (session files and subagent artifacts) and `~/.omp/logs/`,",
  },

  // MCP discovery.
  {
    id: "mcp-why-discovery",
    files: "skills/why/SKILL.md",
    match:
      "list the available MCPs from the Cursor environment. Use the available-tools map when present. Otherwise inspect the `mcps/` directory Cursor exposes for enabled MCP servers.",
    replace:
      "list the available MCPs. Check your own tool list for MCP tools, and read `~/.omp/agent/mcp.json` and the project's `.omp/mcp.json` for the configured servers.",
  },

  // Restarts.
  {
    id: "restart-article",
    match: /\ba Cursor restart\b/g,
    replace: "an omp restart",
  },
  {
    id: "restart-verb",
    match: /\brestart Cursor\b/g,
    replace: "restart omp",
  },

  // poteto-help: install, custom mode, and positioning.
  {
    id: "help-public-copy",
    files: "skills/poteto-help/SKILL.md",
    match: "`https://github.com/cursor/plugins/blob/main/pstack/` followed by its path.",
    replace: "`https://github.com/luizbafilho/open-pstack/blob/main/dist/omp/` followed by its path.",
  },
  {
    id: "help-work-mode",
    files: "skills/poteto-help/SKILL.md",
    match: "and mention once that a Custom Mode keeps it on.",
    replace: "and mention once that omp has no always-on mode, so each new task starts with `/poteto-mode` again.",
  },
  {
    id: "help-install",
    files: "skills/poteto-help/SKILL.md",
    match: "1. Install with `/add-plugin pstack` in chat, or from Customize in the sidebar.",
    replace:
      "1. Install with `omp plugin marketplace add luizbafilho/open-pstack` and `omp plugin install pstack@open-pstack`, as the [README](../../README.md) shows.",
  },
  {
    id: "help-cost-auto",
    files: "skills/poteto-help/SKILL.md",
    match: "which saves tokens when the chat runs on Auto or a cheaper model.",
    replace: "which saves tokens when the chat runs on a cheaper model.",
  },
  {
    id: "help-built-for",
    files: "skills/poteto-help/SKILL.md",
    match:
      "pstack is built for Cursor. Its skills use the Agent Skills format, so other tools can read them. But most workflow skills, including `/poteto-mode`, `/how`, `/why`, and `/teach`, spawn Cursor subagents with per-role models, and Custom Modes and `/loop` are Cursor features, so those parts may not work there.",
    replace: `This is open-pstack, the omp port of pstack. Its skills use the Agent Skills format. Most workflow skills, including \`/poteto-mode\`, \`/how\`, \`/why\`, and \`/teach\`, spawn subagents through the \`task\` tool, one pstack agent per role, with models from ${configFile}.`,
  },
  {
    id: "help-custom-mode-bullets",
    files: "skills/poteto-help/SKILL.md",
    match:
      "- Option+Enter on Mac or Alt+Enter on Windows, or Use as Mode from the skill entry, makes it a Custom Mode. It stays in context every turn until the user exits the mode, and it stays out of casual turns.\n- Cursor's docs list Custom Modes in the Agents Window and the CLI. Elsewhere, start each new task with `/poteto-mode`.\n\nLink [Cursor's skills docs](https://cursor.com/docs/skills) when this comes up.",
    replace:
      "- omp has no always-on mode. Start each new task with `/poteto-mode`, which keeps it out of casual turns.\n\nLink the open-pstack [README](../../README.md) when this comes up.",
  },
  {
    id: "help-plan-mode",
    files: "skills/poteto-help/SKILL.md",
    match: "Cursor's Plan Mode works alongside it.",
    replace: "omp's plan mode works alongside it.",
  },
  {
    id: "help-mode-stopped",
    files: "skills/poteto-help/SKILL.md",
    match: "It was started with Enter. Start it as a Custom Mode, or start each task with `/poteto-mode`.",
    replace: "omp loads it for one task. Start each task with `/poteto-mode`.",
  },

  // Guide: install and custom mode.
  {
    id: "guide-install",
    files: "docs/guide/01-setup.md",
    match: "In a Cursor chat, run:\n\n```text\n/add-plugin pstack\n```\n\nCursor confirms the plugin is installed.",
    replace:
      "Follow the [README](../../README.md): add the open-pstack marketplace and install the plugin.\n\n```text\nomp plugin marketplace add luizbafilho/open-pstack\nomp plugin install pstack@open-pstack\n```\n\n`/poteto-mode` shows up as a command in the next session.",
  },
  {
    id: "guide-custom-mode-setup",
    files: "docs/guide/01-setup.md",
    match: /To keep `\/poteto-mode` on for the whole chat, pick it from the `\/` menu with Option\+Enter[^\n]*and it fades as the chat moves on\./g,
    replace:
      "omp has no always-on mode, so `/poteto-mode` attaches the skill to one message, and it fades as the chat moves on. Start each new task with it again.",
  },
  {
    id: "guide-custom-mode-poteto-mode",
    files: "docs/guide/02-poteto-mode.md",
    match:
      "and a Custom Mode keeps `/poteto-mode` in context on every turn. [Set up pstack](./01-setup.md#run-your-first-task) shows how to start one.",
    replace: "and starting each task with `/poteto-mode` puts the skill back in context.",
  },
]

export default omp
