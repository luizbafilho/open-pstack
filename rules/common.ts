import type { Rule } from "../src/types"

const agentSkillsSpec = "the [Agent Skills spec](https://agentskills.io/specification)"

const common: Rule[] = [
  // Dropped content: make-bot-ui and the benny automation pack.
  {
    id: "drop-make-bot-ui-help-row",
    files: "skills/poteto-help/SKILL.md",
    match: /^\| Build a page whose buttons wake a Grok Bot over a webhook \| \[`\/make-bot-ui`\]\(\.\.\/make-bot-ui\/SKILL\.md\) \|\n/gm,
    replace: "",
  },
  {
    id: "drop-make-bot-ui-guide-section",
    files: "docs/guide/09-make-it-yours.md",
    match: /^## Build a bot UI with `\/make-bot-ui`\n\n[^\n]*\n\n/gm,
    replace: "",
  },
  {
    id: "drop-benny-guide-paragraph",
    files: "docs/guide/07-overnight.md",
    match: /^pstack ships this as a dormant \[automation pack\]\(\.\.\/\.\.\/automations\/benny\/README\.md\)[^\n]*\n\n/gm,
    replace: "",
  },

  // cursor-team-kit skills: use them when installed, otherwise skip.
  {
    id: "team-kit-deslop-skill",
    match: "the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`)",
    replace: "the `deslop` skill (`/deslop`) if installed, otherwise skip it",
  },
  {
    id: "team-kit-deslop-opening-a-pr",
    files: "skills/poteto-mode/playbooks/opening-a-pr.md",
    match: "Run `/deslop` from `cursor-team-kit` over the diff before commit.",
    replace: "Run `/deslop` over the diff before commit if it's installed. Otherwise skip it.",
  },
  {
    id: "team-kit-deslop-guide",
    files: "docs/guide/05-build-and-clean.md",
    match: "`/deslop` ships in the `cursor-team-kit` plugin, not in pstack.",
    replace: "`/deslop` is a separate skill, not part of pstack.",
  },
  {
    id: "team-kit-control-publishes",
    files: "skills/poteto-mode/SKILL.md",
    match:
      "`cursor-team-kit` publishes `control-cli` (CLIs and TUIs) and `control-ui` (browser / Electron / web UIs).",
    replace:
      "Use `control-cli` (CLIs and TUIs) or `control-ui` (browser / Electron / web UIs) if installed. Otherwise skip it.",
  },
  {
    id: "team-kit-control-pair",
    match: /`(control-ui|control-cli)` or `(control-ui|control-cli)` from `cursor-team-kit`/g,
    replace: "`$1` or `$2`, if installed",
  },
  {
    id: "team-kit-control-each",
    files: "skills/poteto-mode/playbooks/multi-phase-plan.md",
    match: /use `(control-ui|control-cli)` from `cursor-team-kit`/g,
    replace: "use `$1` if installed",
  },
  {
    id: "team-kit-orchestrate-local-list",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match:
      'Always `environment: "cloud"` unless the task needs this machine: `control-ui` or `control-cli` runtime verification (from `cursor-team-kit`). Reading local transcripts under `agent-transcripts/`. Simulators and local IDE state. Auth that exists only here. Cloud agents cannot read the local store, so their briefs inline what they need or point at repo paths.',
    replace: "A subagent in its own worktree. Its brief inlines what it needs or points at repo paths.",
  },
  {
    id: "team-kit-not-in-pstack",
    files: "skills/poteto-help/SKILL.md",
    match: "- `/deslop`, `control-cli`, and `control-ui` ship in the `cursor-team-kit` plugin.",
    replace: "- `/deslop`, `control-cli`, and `control-ui` are separate skills. pstack uses them when they're installed and skips those steps otherwise.",
  },

  // Cursor's built-in create-skill: write SKILL.md to the Agent Skills spec.
  {
    id: "create-skill-prose-surface",
    files: "skills/poteto-mode/SKILL.md",
    match: "Agent-facing prose also follows the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).",
    replace: `Agent-facing prose in a \`SKILL.md\` also follows ${agentSkillsSpec}.`,
  },
  {
    id: "create-skill-authoring-playbook",
    files: "skills/poteto-mode/playbooks/authoring-a-skill.md",
    match: "1. Use the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).",
    replace: `1. Write the \`SKILL.md\` to ${agentSkillsSpec}.`,
  },
  {
    id: "create-skill-automate-me-description",
    files: "skills/automate-me/SKILL.md",
    match: "via create-skill + unslop",
    replace: "per the Agent Skills spec + unslop",
  },
  {
    id: "create-skill-automate-me-intro",
    files: "skills/automate-me/SKILL.md",
    match: "Cursor's built-in `create-skill` (authoring)",
    replace: `${agentSkillsSpec} (authoring)`,
  },
  {
    id: "create-skill-automate-me-draft",
    files: "skills/automate-me/SKILL.md",
    match: "Use Cursor's built-in `create-skill` skill to author the skill. Placement:",
    replace: `Write the skill as a \`SKILL.md\` that follows ${agentSkillsSpec}. Placement:`,
  },
  {
    id: "create-skill-automate-me-yaml",
    files: "skills/automate-me/SKILL.md",
    match: "follow `create-skill`'s YAML rules",
    replace: "follow the Agent Skills spec's frontmatter rules",
  },
  {
    id: "create-skill-automate-me-guidelines",
    files: "skills/automate-me/SKILL.md",
    match: "Apply the **unslop** skill and `create-skill`'s writing guidelines to every line.",
    replace: "Apply the **unslop** skill to every line.",
  },
  {
    id: "create-skill-automate-me-benchmark",
    files: "skills/automate-me/SKILL.md",
    match: "A `create-skill`-style test/iterate benchmark loop",
    replace: "A test/iterate benchmark loop",
  },
  {
    id: "create-skill-automate-me-task-skill",
    files: "skills/automate-me/SKILL.md",
    match: "`create-skill` alone, no mining required.",
    replace: "a plain `SKILL.md` written to the Agent Skills spec, no mining required.",
  },
  {
    id: "create-skill-reflect-substantive",
    files: "skills/reflect/SKILL.md",
    match: "hand to Cursor's built-in `create-skill` skill and run its draft / test / iterate loop.",
    replace: `write it to ${agentSkillsSpec} and run a draft / test / iterate loop: draft it, test it on a real prompt, revise.`,
  },
  {
    id: "create-skill-reflect-tune",
    files: "skills/reflect/SKILL.md",
    match: "hand to `create-skill` and run its description-optimization loop.",
    replace: "rewrite its `description` to name the triggers it missed, then check that a matching prompt loads it.",
  },
  {
    id: "create-skill-reflect-new",
    files: "skills/reflect/SKILL.md",
    match: "hand creation to `create-skill`. Do not invent the shape ad hoc.",
    replace: "write it to the Agent Skills spec. Do not invent the shape ad hoc.",
  },
  {
    id: "create-skill-synthesizer-draft",
    files: "skills/reflect/references/synthesizer.md",
    match: "<draft a new skill via create-skill>",
    replace: "<draft a new skill to the Agent Skills spec>",
  },
  {
    id: "create-skill-new-skill-label",
    files: "skills/reflect/**",
    match: "new skill via create-skill:",
    replace: "new skill:",
  },
  {
    id: "create-skill-guide-automate-me",
    files: "docs/guide/09-make-it-yours.md",
    match: "through Cursor's built-in `create-skill` flow",
    replace: "to the Agent Skills spec",
  },
  {
    id: "create-skill-guide-authoring",
    files: "docs/guide/09-make-it-yours.md",
    match: "which routes through Cursor's built-in `create-skill`,",
    replace: "which writes the skill to the Agent Skills spec,",
  },

  // Cursor's /loop: a background watcher subagent with a heartbeat.
  {
    id: "loop-autonomous-run-wake",
    files: "skills/poteto-mode/playbooks/autonomous-run.md",
    match: "Pick the wake mechanism using Cursor's `/loop` command (a built-in, not a pstack skill).",
    replace:
      "Pick the wake mechanism: a heartbeat watcher. That's a background subagent that waits for an event or an interval, re-checks the finish condition, and returns. Its return wakes you.",
  },
  {
    id: "loop-bug-fix",
    files: "skills/poteto-mode/playbooks/bug-fix.md",
    match: "Drive a long or stubborn hunt with Cursor's `/loop` command.",
    replace: "Drive a long or stubborn hunt with a heartbeat watcher (Autonomous run step 2).",
  },
  {
    id: "loop-1h-backticked",
    files: "skills/poteto-mode/playbooks/*.md",
    match: "`/loop 1h`",
    replace: "a 1h heartbeat watcher",
  },
  {
    id: "loop-1h-check-plan-marker",
    files: "skills/poteto-mode/scripts/check-plan.mjs",
    match: '"/loop 1h"',
    replace: '"1h heartbeat watcher"',
  },
  {
    id: "loop-local-and-cloud-roots",
    files: "skills/poteto-mode/playbooks/autopilot-full.md",
    match: " `/loop` works in local and cloud roots.",
    replace: "",
  },
  {
    id: "loop-dynamic-mode",
    match: "under `/loop` in dynamic mode",
    replace: "under a heartbeat watcher",
  },
  {
    id: "loop-until-phrase",
    match: /\/loop until /g,
    replace: "loop until ",
  },
  {
    id: "loop-per-component",
    files: "skills/poteto-mode/playbooks/visual-parity.md",
    match: "`/loop` per component until the diff is zero.",
    replace: "Repeat per component until the diff is zero.",
  },
  {
    id: "loop-predicate",
    match: /(Give|give|gives) `\/loop` /g,
    replace: "$1 the loop ",
  },
  {
    id: "loop-needs-check",
    files: "skills/poteto-help/SKILL.md",
    match: "`/loop` needs a check",
    replace: "The loop needs a check",
  },
  {
    id: "loop-guide-overnight",
    files: "docs/guide/07-overnight.md",
    match:
      "- `/loop` is Cursor's built-in wake mechanism, not a pstack skill. The [Autonomous run playbook](../../skills/poteto-mode/playbooks/autonomous-run.md) uses it to re-check the finish condition on events or a heartbeat.",
    replace:
      '- "loop until done" makes the [Autonomous run playbook](../../skills/poteto-mode/playbooks/autonomous-run.md) start a heartbeat watcher, a background subagent that re-checks the finish condition on events or on a timer.',
  },
  {
    id: "loop-create-skill-not-in-pstack",
    files: "skills/poteto-help/SKILL.md",
    match: "- `/loop` and `/create-skill` are Cursor built-ins.",
    replace:
      "- There's no `/loop` or `/create-skill` command. pstack uses a heartbeat watcher (a background subagent) where upstream used `/loop`, and writes `SKILL.md` files to the Agent Skills spec where upstream used `/create-skill`.",
  },

  // Cloud agents: a local subagent in its own worktree.
  {
    id: "cloud-owner-per-pr",
    match: "One Cursor cloud agent per PR owns",
    replace: "One subagent per PR, in its own worktree, owns",
  },
  {
    id: "cloud-each-verifier",
    files: "skills/poteto-mode/playbooks/shipping.md",
    match: "each a Cursor cloud agent,",
    replace: "each in its own worktree,",
  },
  {
    id: "cloud-swarm-intro",
    files: "skills/swarm/SKILL.md",
    match: "Fan out N parallel cloud workers.",
    replace: "Fan out N parallel workers, each a subagent in its own worktree.",
  },
  {
    id: "cloud-swarm-concurrency",
    files: "skills/swarm/SKILL.md",
    match: "N is total workers, not the cloud concurrency limit.",
    replace: "N is total workers, not a concurrency limit.",
  },
  {
    id: "cloud-swarm-base-branch",
    files: "skills/swarm/SKILL.md",
    match: "When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.",
    replace: "When a worker must start from a non-default pushed branch, tell it to create its worktree from that branch.",
  },
  {
    id: "cloud-orchestrate-brief",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match: "its spawn budget with the cloud default and the local exception list,",
    replace: "its spawn budget,",
  },
  {
    id: "cloud-orchestrate-restacks",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match: "Restacks run in cloud. A local restack at this scale takes the laptop down.",
    replace: "Restacks run in a subagent, one at a time. Parallel restacks at this scale take the laptop down.",
  },
  {
    id: "cloud-orchestrate-liveness",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match: "the cloud agent's status in the Cursor dashboard.",
    replace: "the subagent's session status.",
  },
  {
    id: "cloud-orchestrate-restart",
    files: "skills/poteto-mode/playbooks/orchestrate.md",
    match:
      "After a Cursor restart: local agents are dead, cloud work is not. Re-read the standing orders and `units.tsv`, recompute the frontier, reattach cloud work by PR and branch rather than agent id,",
    replace:
      "After a restart, running subagents are dead and their pushed work is not. Re-read the standing orders and `units.tsv`, recompute the frontier, reattach pushed work by PR and branch rather than agent id,",
  },
  {
    id: "cloud-live-lane",
    files: "skills/poteto-mode/playbooks/multi-phase-plan.md",
    match: "Each live lane runs on its own cloud VM at the PR head.",
    replace: "Each live lane runs in its own worktree at the PR head.",
  },
  {
    id: "cloud-session-pickup-url",
    match: /(a )?cloud-agent URL/g,
    replace: (_m, article: string | undefined) => `${article ?? ""}session ID`,
  },
  {
    id: "cloud-help-swarm-row",
    files: "skills/poteto-help/SKILL.md",
    match: "Run parallel checks over slices, or race workers, as cloud agents",
    replace: "Run parallel checks over slices, or race workers, as subagents",
  },
  {
    id: "cloud-help-overwrote",
    files: "skills/poteto-help/SKILL.md",
    match: "Give each agent its own worktree, or run them as cloud agents, which each get their own machine.",
    replace: "Give each agent its own worktree.",
  },
  {
    id: "cloud-guide-pitfall",
    files: "docs/guide/10-recipes-and-pitfalls.md",
    match: 'Run them as cloud agents, or say "own worktree per attempt".',
    replace: 'Say "own worktree per attempt".',
  },
  {
    id: "cloud-guide-isolation",
    files: "docs/guide/02-poteto-mode.md",
    match:
      /The cleanest isolation is a \[cloud subagent\]\(https:\/\/cursor\.com\/docs\/subagents#cloud-subagents\)\.[^\n]*\n\nWhen the work has to stay local, ask for a worktree up front:/g,
    replace: "The cleanest isolation is a git worktree per agent, plus its own ports when it runs the app. Ask for one up front:",
  },
  {
    id: "cloud-guide-project",
    files: "docs/guide/07-overnight.md",
    match:
      "A [Cursor Project](https://cursor.com/blog/projects) gives one coordinator agent a persistent thread. The coordinator doesn't write code. It directs subagents, which run in the cloud by default, so the work continues when your laptop is closed.",
    replace:
      "One long-lived session gives a coordinator agent a persistent thread. The coordinator doesn't write code. It directs subagents, each in its own worktree.",
  },
  {
    id: "cloud-guide-project-habits",
    files: "docs/guide/07-overnight.md",
    match:
      "- Give each body of work its own Project, such as a feature, a migration, a perf push, or a tech-debt cleanup. Several can run side by side.\n- Drag related chats into the Project, finished ones included. They become context for every agent in it.\n",
    replace:
      "- Give each body of work its own coordinator session, such as a feature, a migration, a perf push, or a tech-debt cleanup. Several can run side by side.\n- Point the coordinator at related sessions, finished ones included. `/recall` reads them as context.\n",
  },
  {
    id: "cloud-guide-project-prompt",
    files: "docs/guide/07-overnight.md",
    match: "One prompt can carry a whole Project,",
    replace: "One prompt can carry a whole coordinator session,",
  },

  // Cursor's built-in skills and restarts.
  {
    id: "builtin-babysit-poteto-mode",
    files: "skills/poteto-mode/SKILL.md",
    match: "and not Cursor's built-in babysit skill, whose description matches the same words.",
    replace: "and not any other installed babysit skill whose description matches the same words.",
  },
  {
    id: "builtin-babysit-playbook",
    files: "skills/poteto-mode/playbooks/babysit.md",
    match: "This playbook replaces Cursor's built-in babysit skill for these requests,",
    replace: "This playbook replaces any other installed babysit skill for these requests,",
  },
  {
    id: "builtin-help-own-skill",
    files: "skills/poteto-help/SKILL.md",
    match: "can start Cursor's own skill for the same job instead.",
    replace: "can start another installed skill for the same job instead.",
  },
]

export default common
