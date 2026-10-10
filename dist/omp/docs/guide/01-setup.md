# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

Follow the [README](../../README.md): add the open-pstack marketplace and install the plugin.

```text
omp plugin marketplace add luizbafilho/open-pstack
omp plugin install pstack@open-pstack
```

`/skill:poteto-mode` shows up as a command in the next session.

## Pick your models

Run:

```text
/skill:setup-pstack
```

[`/skill:setup-pstack`](../../skills/setup-pstack/SKILL.md) detects the models you have access to, asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes `~/.omp/agent/pstack.yml`, a config overlay that sets the model of every pstack agent. omp loads it through `PI_CONFIG_FILES`, as the [README](../../README.md) shows.

You only override what you care about. A role with no key keeps its agent's default model. To restore a default, delete that key. A rerun of `/skill:setup-pstack` keeps any role whose model differs from the default.

Set a role to `inherit-parent` or `auto` and setup writes it as `"@default"`, so that agent runs on your parent chat model. For a panel role the value is a list of up to three entries, one per seat agent, so the list length sets the panel size. Setup also configures `swarm workers`, the model for every `/skill:swarm` worker.

## Accept the verification offer, or don't

At the end of setup, `/skill:setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/skill:create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `.omp/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/skill:create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Model changes apply to the next subagent spawn, with no restart.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/skill:setup-pstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main chat with cheaper, faster models in the code roles is a good split.
- Set a role to `auto` or `inherit-parent` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/skill:poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/skill:poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/skill:poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. omp has no always-on mode, so `/skill:poteto-mode` attaches the skill to one message, and it fades as the chat moves on. Start each new task with it again.

Next: [Route work through `/skill:poteto-mode`](./02-poteto-mode.md).
