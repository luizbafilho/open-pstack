---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's session. It is the newest session for this workspace. List this workspace's sessions, newest first, with `opencode api get "/api/session?directory=$PWD&order=desc"`, and read one with `opencode api get "/api/session/<id>/message"`. Redirect each call's output to a file and read that, because piped `opencode api` output can be cut off. Use only those sessions. Never list sessions without `directory`. That crosses workspace boundaries and reads private chats from unrelated projects.

For each candidate, read its first user message. Take the session whose first user message contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three `subagent` calls, `agent: "general"`. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and `general` has it.

Each reviewer and the synthesizer name a role line in the `pstack-models.md` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the `subagent` tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message.

| Lens | Role line | Default `model` | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `anthropic/claude-opus-5-5#xhigh` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `opencode/grok-4.7#xhigh` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `anthropic/claude-opus-5-5#xhigh` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the session ID or digest where marked. Reviewers return findings in the `subagent` result.

## 3. Synthesize

One `subagent` call, `agent: "general"`, `model` from the `reflect judgment, divergent, synthesizer` line (default `anthropic/claude-opus-5-5#xhigh`). It spot-verifies citations through MCP, which `general` has. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

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
