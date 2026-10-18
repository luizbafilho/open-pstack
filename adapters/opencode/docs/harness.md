# Upstream feature guidance

Use this note when an upstream skill names a host feature that OpenCode does not provide.

- A hosted worker maps to a `subagent` call with `agent: "general"`. For writing tasks, tell each worker to create its own git worktree. OpenCode does not isolate a subagent automatically.
- A requested base branch means the worker creates its worktree from that branch.
- A host dashboard status maps to the subagent result and session state available through OpenCode. Do not claim a worker remains active after the session ends.
- Bugbot and other review automation are ordinary review threads when present. If the skill asks to start or configure a service that is unavailable, skip that step and state why.
- A built-in pull-request action maps to the resolved forge CLI, such as `gh pr create`.
- A routine, webhook, or secret-request flow requires its host service. If unavailable, skip the affected step and state why; do not imitate the external service.
- OpenCode starts background subagents. Wait only when a result is needed.
