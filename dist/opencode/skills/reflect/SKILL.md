---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own session before fanning out. It is the newest session for this workspace. List this workspace's sessions, newest first, with `opencode api get "/api/session?directory=$PWD&order=desc"`, and read one with `opencode api get "/api/session/<id>/message"`. Redirect each call's output to a file and read that, because piped `opencode api` output can be cut off. Use only those sessions. Never list sessions without `directory`. That crosses workspace boundaries and reads private chats from unrelated projects.

For each candidate, read its first user message and check that it contains the conversation's opening user prompt. Take the matching session ID. If none matches, write a tight digest of the session and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three `subagent` calls, `agent: "general"`, with `model` set as below. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript), and `general` has it.

Each reviewer and the synthesizer name a role line in the `pstack-models.md` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the `subagent` tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `anthropic/claude-opus-5-5#max` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `openai/gpt-5.6-sol#max` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `anthropic/claude-opus-5-5#max` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the session ID or digest where marked. Reviewers return findings in the `subagent` result.

### 3. Synthesize

One `subagent` call, `agent: "general"`, with `model` from the `reflect judgment, divergent, synthesizer` line (default `anthropic/claude-opus-5-5#max`). The synthesizer's quality check includes spot-verifying citations, which can require MCP access, and `general` has it. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

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
