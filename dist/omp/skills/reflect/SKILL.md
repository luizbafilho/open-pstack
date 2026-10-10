---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/skill:reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. This workspace's sessions are the `.jsonl` files in `~/.omp/agent/sessions/<bucket>/`, where `<bucket>` is the workspace path relative to your home directory with each "/" turned into "-" (so `~/work/proj` becomes `-work-proj`). Use only that directory. Never read another session bucket. That crosses workspace boundaries and reads private chats from unrelated projects.

```bash
ls -t ~/.omp/agent/sessions/<bucket>/*.jsonl | head -10
```

For each candidate, find the first `"type":"message"` entry with `"role":"user"` and check that its text contains the conversation's opening user prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One `task` call with three tasks, each on the agent below. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript), and these agents have it.

Each reviewer and the synthesizer name a pstack agent. omp picks each agent's model from its `modelRoles` key in `~/.omp/agent/pstack.yml`, which `/skill:setup-pstack` writes, and falls back to the agent's default.

| Lens | Agent | Prompt template |
|---|---|---|
| Judgment | `pstack-reflect-judgment` | `references/judgment-reviewer.md` |
| Tooling | `pstack-reflect-tooling` | `references/tooling-reviewer.md` |
| Divergent | `pstack-reflect-judgment` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `task` result.

### 3. Synthesize

One `task` call on `pstack-reflect-judgment`. The synthesizer's quality check includes spot-verifying citations, which can require MCP access, and that agent has it. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): write it to the [Agent Skills spec](https://agentskills.io/specification) and run a draft / test / iterate loop: draft it, test it on a real prompt, revise.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): rewrite its `description` to name the triggers it missed, then check that a matching prompt loads it.
- `new skill: <kebab-name>`: write it to the Agent Skills spec. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
