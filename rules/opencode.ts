import type { Rule } from "../src/types"

const modelsFile = "`~/.config/opencode/pstack-models.md`"
const listSessions = 'opencode api get "/api/session?directory=$PWD&order=desc"'
const readSession = 'opencode api get "/api/session/<id>/message"'
const redirectNote = "Redirect each call's output to a file and read that, because piped `opencode api` output can be cut off."

const opencode: Rule[] = [
  // Subagent types.
  {
    id: "agent-poteto-agent-description",
    files: "agents/poteto-agent.md",
    match: "Substituting `generalPurpose` skips that read and drifts.",
    replace: "Substituting `general` skips that read and drifts.",
  },
  {
    id: "agent-comment-sicko-spawn",
    files: "skills/no-comments/SKILL.md",
    match: 'Spawn `Task` with `subagent_type: "Comment Sicko"`.',
    replace: 'Call the `subagent` tool with `agent: "comment-sicko"`.',
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
  {
    id: "agent-readonly-list",
    match: /- `subagent_type`: `generalPurpose`\n(- `model`: [^\n]*\n)- `readonly`: `true`\n/g,
    replace: "- `agent`: `explore`\n$1",
  },
  {
    id: "agent-why-investigators-mcp",
    files: "skills/why/SKILL.md",
    match:
      "- `readonly`: `false` (agent mode). **Do not use readonly/Ask mode.** It strips MCP access, which disables MCP-backed investigators entirely. Investigators still shouldn't write anything.",
    replace: "- Investigators need MCP access, which `general` has. They still shouldn't write anything.",
  },
  {
    id: "agent-why-synthesizer-mcp",
    files: "skills/why/SKILL.md",
    match:
      "\n- `readonly`: `false` (agent mode). The synthesizer's quality check spot-verifies citations, which can require MCP access. Readonly/Ask mode strips MCPs and defeats that.",
    replace: "",
  },
  {
    id: "agent-general-list",
    match: "- `subagent_type`: `generalPurpose`",
    replace: "- `agent`: `general`",
  },
  {
    id: "agent-reflect-reviewers-mcp",
    files: "skills/reflect/SKILL.md",
    match:
      ", agent mode (`readonly: false`). Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Readonly strips MCPs.",
    replace:
      ". Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript), and `general` has it.",
  },
  {
    id: "agent-reflect-synthesizer-mcp",
    files: "skills/reflect/SKILL.md",
    match:
      ", agent mode (`readonly: false`). The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Readonly strips MCPs.",
    replace:
      ". The synthesizer's quality check includes spot-verifying citations, which can require MCP access, and `general` has it.",
  },
  {
    id: "agent-swarm-spawn",
    files: "skills/swarm/SKILL.md",
    match:
      'with `subagent_type: generalPurpose`, `environment: "cloud"`, `run_in_background: true`, and the step 4 model, left unset for `auto` or `inherit-parent`. Use `environment: "local"` only when the worker needs access to something on the user\'s computer.',
    replace:
      'with `agent: "general"`, `background: true`, and the step 4 model, left unset for `auto` or `inherit-parent`. Tell each worker that writes to create its own git worktree first.',
  },
  {
    id: "agent-general",
    match: "subagent_type: generalPurpose",
    replace: 'agent: "general"',
  },
  {
    id: "agent-arena-judge",
    files: "skills/arena/SKILL.md",
    match: "Spawn one readonly judge subagent on that model.",
    replace: 'Spawn one judge subagent with `agent: "explore"` on that model.',
  },
  {
    id: "agent-model-families",
    match: "Families go by prefix: `claude-*`, `gpt-*`, and `grok-*`",
    replace: "Families go by model name after the provider: `claude-*`, `gpt-*`, and `grok-*`",
  },
  {
    id: "agent-orchestrate-nesting",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match: "(nesting works to depth 3, and a nested spawn has the full Task schema including `environment`)",
    replace:
      "(a nested spawn uses the same `subagent` tool. The built-in `general` agent can't spawn subagents, so run sub-coordinators as `poteto-agent`)",
  },

  // Cursor's Task tool: OpenCode's subagent tool.
  {
    id: "task-setup-detect-models",
    files: "skills/setup-pstack/SKILL.md",
    match:
      "Enumerate the model slugs you can pass to a `Task` subagent in this session. That is the dependable source. If Cursor also exposes a models API or CLI that lists the user's entitled models, prefer it for completeness.",
    replace:
      "Run `opencode models` to list the models available in this setup. Each model's reasoning variants (`#max`, `#xhigh`, and so on) are in the `variants` field of `opencode api get /api/model`. Redirect that output to a file and read the file, because piped `opencode api` output can be cut off.",
  },
  {
    id: "task-setup-effort-token",
    files: "skills/setup-pstack/SKILL.md",
    match: "The effort token is the last token, or the one before a trailing `fast`, on the ladder",
    replace: "The effort token is the `#variant` suffix of a `provider/model#variant` ID, on the ladder",
  },
  {
    id: "task-defaults",
    files: "skills/poteto-mode/SKILL.md",
    match: "`run_in_background: true`, agent mode (readonly strips MCP), file pointers",
    replace: "`background: true`, file pointers",
  },
  {
    id: "task-omit-model",
    match: "omit Task `model`",
    replace: "omit the `subagent` tool's `model`",
  },
  {
    id: "task-one-subagent",
    match: /\bone Task subagent\b/g,
    replace: "one subagent",
  },
  {
    id: "task-the-tool",
    match: /\bthe Task tool\b/g,
    replace: "the `subagent` tool",
  },
  {
    id: "task-response-body",
    files: "skills/reflect/SKILL.md",
    match: "in the `Task` response body",
    replace: "in the `subagent` result",
  },
  {
    id: "task-backticked",
    match: "`Task`",
    replace: "`subagent`",
  },
  {
    id: "task-background",
    match: "run_in_background: true",
    replace: "background: true",
  },

  // AskQuestion: OpenCode's question tool.
  {
    id: "ask-question-tool",
    match: "the `AskQuestion` tool",
    replace: "the `question` tool",
  },
  {
    id: "ask-question-about-to",
    files: "skills/poteto-mode/SKILL.md",
    match: "About to `AskQuestion` on",
    replace: "About to use the `question` tool on",
  },
  {
    id: "ask-question-prefer",
    files: "skills/setup-pstack/SKILL.md",
    match: "Prefer AskQuestion over free text.",
    replace: "Prefer the `question` tool over free text.",
  },
  {
    id: "ask-question-verb",
    match: /\b(with|use) `AskQuestion`/g,
    replace: "$1 the `question` tool",
  },

  // The model config file.
  {
    id: "models-setup-description",
    files: "skills/setup-pstack/SKILL.md",
    match: "writes an always-applied rule that overrides the skill defaults.",
    replace: "writes a file the pstack plugin loads into every session, which overrides the skill defaults.",
  },
  {
    id: "models-setup-intro",
    files: "skills/setup-pstack/SKILL.md",
    match: "`~/.cursor/rules/pstack-models.mdc`, an always-applied rule that sets pstack's model per role.",
    replace: `${modelsFile}, a file the pstack plugin loads into every session. It sets pstack's model per role.`,
  },
  {
    id: "models-setup-write",
    files: "skills/setup-pstack/SKILL.md",
    match: "`~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true`, a `# budget` line",
    replace: `${modelsFile} as plain Markdown with a \`# budget\` line`,
  },
  {
    id: "models-setup-shape-frontmatter",
    files: "skills/setup-pstack/SKILL.md",
    match: "```\n---\ndescription: pstack per-role model choices (overrides skill defaults)\nalwaysApply: true\n---\n",
    replace: "```\n",
  },
  {
    id: "models-setup-auto",
    files: "skills/setup-pstack/SKILL.md",
    match: "this role runs on the parent chat model, which is how Auto users stay on Auto)",
    replace: "this role runs on the parent chat model)",
  },
  {
    id: "models-path",
    match: "`~/.cursor/rules/pstack-models.mdc`",
    replace: modelsFile,
  },
  {
    id: "models-name",
    match: "`pstack-models.mdc`",
    replace: "`pstack-models.md`",
  },

  // Skill directories.
  {
    id: "skills-reflect-read-calls",
    files: "skills/reflect/references/*.md",
    match:
      "- `Read` tool calls against any `SKILL.md` file (workspace `.cursor/skills/`, user-level `~/.cursor/skills/`, or plugin-installed paths under `~/.cursor/plugins/`)",
    replace:
      "- `skill` tool calls, and `read` tool calls against any `SKILL.md` file (workspace `.opencode/skills/`, user-level `~/.config/opencode/skills/`, or a plugin's directory)",
  },
  {
    id: "skills-user-dir",
    match: "~/.cursor/skills/",
    replace: "~/.config/opencode/skills/",
  },
  {
    id: "skills-project-dir",
    match: ".cursor/skills/",
    replace: ".opencode/skills/",
  },

  // Transcripts: OpenCode session history through `opencode api`.
  {
    id: "transcripts-recall-location",
    files: "skills/recall/SKILL.md",
    match:
      'Transcripts live at `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, where `<slug>` is the workspace path with the leading slash dropped and each "/" turned into "-" (so `/Users/you/proj` becomes `Users-you-proj`). Every line is one chat message.',
    replace: `Chats live in OpenCode's session store. \`${listSessions.replace("order=desc", "order=desc&parentID=null")}\` lists this workspace's top-level chats, newest first, each with an \`id\`, a \`title\`, and \`time.updated\`. \`${readSession}\` returns one chat's messages. ${redirectNote}`,
  },
  {
    id: "transcripts-recall-order",
    files: "skills/recall/SKILL.md",
    match: "order candidates by real modification time (`ls -t`) and never by UUID name",
    replace: "order candidates by `time.updated` and never by session ID",
  },
  {
    id: "transcripts-recall-cite",
    files: "skills/recall/SKILL.md",
    match: "each citing the chat UUID",
    replace: "each citing the session ID",
  },
  {
    id: "transcripts-system-prompt",
    match: /The system prompt names the (?:active )?workspace's `agent-transcripts\/` directory\. Use (?:only )?that path\./g,
    replace: `List this workspace's sessions, newest first, with \`${listSessions}\`, and read one with \`${readSession}\`. ${redirectNote} Use only those sessions.`,
  },
  {
    id: "transcripts-reflect-own",
    files: "skills/reflect/SKILL.md",
    match: "The parent finds its own transcript file before fanning out.",
    replace: "The parent finds its own session before fanning out. It is the newest session for this workspace.",
  },
  {
    id: "transcripts-reflect-candidates",
    files: "skills/reflect/SKILL.md",
    match:
      /```bash\nls -t <agent-transcripts>[^\n]*\n```\n\nThree transcript layouts:[^\n]*\n\nFor each candidate, read the first JSONL line and check that `message\.content\[0\]\.text` contains the conversation's opening user prompt\. Take the matching path\. If no path resolves,/g,
    replace:
      "For each candidate, read its first user message and check that it contains the conversation's opening user prompt. Take the matching session ID. If none matches,",
  },
  {
    id: "transcripts-reflect-substitute",
    files: "skills/reflect/SKILL.md",
    match: "substituting the transcript path or digest where marked",
    replace: "substituting the session ID or digest where marked",
  },
  {
    id: "transcripts-reviewer-read",
    files: "skills/reflect/references/*-reviewer.md",
    match: "Read the active transcript at <ABSOLUTE_PATH> (or use the digest below if no path is given).",
    replace: `Read the active session with \`opencode api get "/api/session/<SESSION_ID>/message"\`. ${redirectNote} Use the digest below instead if no session ID is given.`,
  },
  {
    id: "transcripts-automate-me-slices",
    files: "skills/automate-me/SKILL.md",
    match: "reads transcripts from the workspace-scoped path the parent provides",
    replace: "reads the workspace's sessions the parent lists",
  },
  {
    id: "transcripts-session-pickup",
    files: "skills/poteto-mode/playbooks/session-pickup.md",
    match:
      "A local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names the path. Do not glob across `~/.cursor/projects/*/`, that crosses workspace boundaries and reads private chats from unrelated projects)",
    replace: `A prior session in the active workspace (list them with \`${listSessions}\` and read one with \`${readSession}\`. Never list sessions without \`directory\`, which crosses workspace boundaries and reads private chats from unrelated projects)`,
  },
  {
    id: "transcripts-under-directory",
    match: /transcript under the active workspace's `agent-transcripts\/` directory \(the system prompt names (?:this|the) path\)/g,
    replace: `session in the active workspace (list them with \`${listSessions}\` and read one with \`${readSession}\`)`,
  },
  {
    id: "transcripts-no-glob",
    match: /Do(?:n't| not) glob across `~\/\.cursor\/projects\/\*\/`/g,
    replace: "Never list sessions without `directory`",
  },
  {
    id: "transcripts-worktree-audit-dir",
    files: "skills/poteto-mode/scripts/worktree-audit.sh",
    match:
      '# Transcripts dir: ~/.cursor/projects/<slugified-repo-path>/agent-transcripts.\nslug=$(printf \'%s\' "$main_wt" | sed \'s#^/##; s#/#-#g\')\ntranscripts="$HOME/.cursor/projects/$slug/agent-transcripts"\n',
    replace: "",
  },
  {
    id: "transcripts-worktree-audit-lookup",
    files: "skills/poteto-mode/scripts/worktree-audit.sh",
    match:
      '\t# Most recent chat whose transcript operated in this worktree. Match path\n\t# followed by "/" or a quote so glint-482 does not match glint-482-r37.\n\tlast="-"; last_ts=0\n\tif [ -d "$transcripts" ]; then\n\t\tf=$(rg -l -e "${wt}/" -e "${wt}\\"" "$transcripts" 2>/dev/null \\\n\t\t\t| xargs stat -f \'%m %N\' 2>/dev/null | sort -rn | head -1)\n\t\tif [ -n "$f" ]; then last_ts=$(echo "$f" | awk \'{print $1}\')\n\t\t\tlast=$(date -r "$last_ts" \'+%Y-%m-%d\' 2>/dev/null); fi\n\tfi\n',
    replace:
      '\t# Most recent OpenCode session whose directory is this worktree.\n\tlast="-"; last_ts=0\n\tupdated=$(opencode api get "/api/session?directory=${wt}&limit=1&order=desc" 2>/dev/null \\\n\t\t| jq -r \'.data[0].time.updated // empty\' 2>/dev/null)\n\tif [ -n "$updated" ]; then last_ts=$(( updated / 1000 ))\n\t\tlast=$(date -r "$last_ts" \'+%Y-%m-%d\' 2>/dev/null); fi\n',
  },
  {
    id: "transcripts-worktree-cleanup-scan",
    files: "skills/poteto-mode/playbooks/worktree-cleanup.md",
    match: "The transcript scan is slow, so background it.",
    replace: "It queries OpenCode's session API once per worktree, so background it.",
  },

  // Worktree and disk paths.
  {
    id: "paths-worktree-cleanup-location",
    files: "skills/poteto-mode/playbooks/worktree-cleanup.md",
    match: "misses one that lives at `.cursor/worktrees/myrepo/x`",
    replace: "misses one that OpenCode created in its configured `worktree.directory`",
  },
  {
    id: "paths-worktree-cleanup-app-support",
    files: "skills/poteto-mode/playbooks/worktree-cleanup.md",
    match:
      "`~/Library/Application Support/Cursor` (`state.vscdb.backup`, and `snapshots/roots/<root>` where a `<root>` named for a folder you opened as a workspace balloons),",
    replace: "OpenCode's `~/.local/share/opencode` (`log/`, `snapshot/`, and `tool-output/`),",
  },

  // MCP discovery.
  {
    id: "mcp-why-discovery",
    files: "skills/why/SKILL.md",
    match:
      "list the available MCPs from the Cursor environment. Use the available-tools map when present. Otherwise inspect the `mcps/` directory Cursor exposes for enabled MCP servers.",
    replace:
      "list the available MCPs. Check your own tool list for MCP tools, and run `opencode mcp list` for the enabled servers.",
  },

  // Restarts.
  {
    id: "restart-article",
    match: /\ba Cursor restart\b/g,
    replace: "an OpenCode restart",
  },

  // poteto-help: install, custom mode, and positioning.
  {
    id: "help-public-copy",
    files: "skills/poteto-help/SKILL.md",
    match: "`https://github.com/cursor/plugins/blob/main/pstack/` followed by its path.",
    replace: "`https://github.com/luizbafilho/open-pstack/blob/main/dist/opencode/` followed by its path.",
  },
  {
    id: "help-work-mode",
    files: "skills/poteto-help/SKILL.md",
    match: "and mention once that a Custom Mode keeps it on.",
    replace: "and mention once that switching to the `poteto` agent keeps it on.",
  },
  {
    id: "help-install",
    files: "skills/poteto-help/SKILL.md",
    match: "1. Install with `/add-plugin pstack` in chat, or from Customize in the sidebar.",
    replace: "1. Install by adding open-pstack's `dist/opencode` directory to `plugins` in `opencode.json`, as the [README](../../README.md) shows.",
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
    replace:
      "This is open-pstack, the OpenCode port of pstack. Its skills use the Agent Skills format. Most workflow skills, including `/poteto-mode`, `/how`, `/why`, and `/teach`, spawn subagents through the `subagent` tool with per-role models from `pstack-models.md`.",
  },
  {
    id: "help-custom-mode-bullets",
    files: "skills/poteto-help/SKILL.md",
    match:
      "- Option+Enter on Mac or Alt+Enter on Windows, or Use as Mode from the skill entry, makes it a Custom Mode. It stays in context every turn until the user exits the mode, and it stays out of casual turns.\n- Cursor's docs list Custom Modes in the Agents Window and the CLI. Elsewhere, start each new task with `/poteto-mode`.\n\nLink [Cursor's skills docs](https://cursor.com/docs/skills) when this comes up.",
    replace:
      "- Switching to the `poteto` agent keeps it on. That agent loads `poteto-mode` at the start of the session and applies it every turn, and it stays out of casual turns.\n- Without the `poteto` agent, start each new task with `/poteto-mode`.\n\nLink the [OpenCode agents docs](https://opencode.ai/v2/docs/agents/) when this comes up.",
  },
  {
    id: "help-plan-mode",
    files: "skills/poteto-help/SKILL.md",
    match: "Cursor's Plan Mode works alongside it.",
    replace: "OpenCode's `plan` agent works alongside it.",
  },
  {
    id: "help-mode-stopped",
    files: "skills/poteto-help/SKILL.md",
    match: "It was started with Enter. Start it as a Custom Mode, or start each task with `/poteto-mode`.",
    replace: "It was started as a one-off command. Switch to the `poteto` agent, or start each task with `/poteto-mode`.",
  },

  // Guide: install and custom mode.
  {
    id: "guide-install",
    files: "docs/guide/01-setup.md",
    match: "In a Cursor chat, run:\n\n```text\n/add-plugin pstack\n```\n\nCursor confirms the plugin is installed.",
    replace:
      "Follow the [README](../../README.md): add open-pstack's `dist/opencode` directory to `plugins` in your `opencode.json`, then run this in that directory:\n\n```text\nbun install --frozen-lockfile\n```\n\n`/poteto-mode` shows up in the `/` menu of the next session.",
  },
  {
    id: "guide-custom-mode-setup",
    files: "docs/guide/01-setup.md",
    match:
      "pick it from the `/` menu with Option+Enter (Mac) or Alt+Enter (Windows) instead of Enter. That makes it a [Custom Mode](https://cursor.com/docs/skills), which stays in context on every turn until you exit it. Custom Modes are available in the Agents Window and the CLI. Plain Enter attaches the skill to one message,",
    replace:
      "switch to the `poteto` agent to keep poteto-mode on every turn. That agent loads the skill at the start of the session and applies it until you switch back. Typing `/poteto-mode` attaches the skill to one message,",
  },
  {
    id: "guide-custom-mode-poteto-mode",
    files: "docs/guide/02-poteto-mode.md",
    match:
      "and a Custom Mode keeps `/poteto-mode` in context on every turn. [Set up pstack](./01-setup.md#run-your-first-task) shows how to start one.",
    replace:
      "and the `poteto` agent keeps `/poteto-mode` in context on every turn. [Set up pstack](./01-setup.md#run-your-first-task) shows how to switch to it.",
  },
]

export default opencode
