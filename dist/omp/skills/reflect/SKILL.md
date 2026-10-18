---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

For host-specific features, read the target guidance at [docs/harness.md](../../docs/harness.md).

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/skill:reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript among the `.jsonl` files in `~/.omp/agent/sessions/<bucket>/`, where `<bucket>` is the workspace path relative to your home directory with each "/" turned into "-" (so `~/work/proj` becomes `-work-proj`). Use only that directory. Never read another session bucket. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t ~/.omp/agent/sessions/<bucket>/*.jsonl | head -10
```

For each candidate, find the first `"type":"message"` entry with `"role":"user"`. Take the file whose text there contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One `task` call with three tasks, each on the agent below. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and these agents have it.

Each reviewer and the synthesizer name a pstack agent. omp picks each agent's model from its `modelRoles` key in `~/.omp/agent/pstack.yml`, which `/skill:setup-pstack` writes, and falls back to the agent's default. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

| Lens | Agent | Prompt template |
|---|---|---|
| Judgment | `pstack-reflect-judgment` | `references/judgment-reviewer.md` |
| Tooling | `pstack-reflect-tooling` | `references/tooling-reviewer.md` |
| Divergent | `pstack-reflect-judgment` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `task` result.

## 3. Synthesize

One `task` call on `pstack-reflect-judgment`. It spot-verifies citations through MCP, which that agent has. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): write it to the [Agent Skills spec](https://agentskills.io/specification) and run a draft / test / iterate loop: draft it, test it on a real prompt, revise.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): rewrite its `description` to name the triggers it missed, then check that a matching prompt loads it.
- `new skill: <kebab-name>`: write it to the Agent Skills spec. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
