# Upstream feature guidance

Use this note when an upstream skill names a host feature that omp does not provide.

- A hosted worker maps to a `task` spawn with `isolated: true` when it writes. For a requested base branch, tell the worker to start its worktree there.
- A host dashboard status maps to the task result and session state available in omp. Do not claim a remote worker remains active after the session ends.
- Bugbot and other review automation are ordinary review threads when present. If the skill asks to start or configure a service that is unavailable, skip that step and state why.
- A built-in pull-request action maps to the resolved forge CLI, such as `gh pr create`.
- A routine, webhook, or secret-request flow requires its host service. If unavailable, skip the affected step and state why; do not imitate the external service.
- omp starts tasks asynchronously. Wait only when a result is needed.
