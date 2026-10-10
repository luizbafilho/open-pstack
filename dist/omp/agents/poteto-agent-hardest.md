---
name: poteto-agent-hardest
description: "pstack's `hardest tasks` role, as poteto-agent. Model: modelRoles.pstack-hardest, default anthropic/claude-opus-5-5:max."
model:
  - "@pstack-hardest"
  - anthropic/claude-opus-5-5:max
autoloadSkills:
  - poteto-mode
---

# Poteto subagent

You are operating as poteto-mode's full agent style. Read the `poteto-mode` skill's `SKILL.md` in full before doing any work, including its inline Principles index. Navigate to a leaf `principle-*` skill whenever you apply that principle.
