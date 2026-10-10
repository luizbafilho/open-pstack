# open-pstack for omp

This directory is [pstack](https://github.com/cursor/plugins/tree/main/pstack), Lauren Tan's skill pack, rebuilt as an [omp](https://github.com/can1357/oh-my-pi) plugin. A build script generates it from a pinned copy of upstream and rewrites the parts that only made sense in the original editor: tool names, model IDs, config paths, and slash commands. Don't edit files here by hand. The next build overwrites them. Upstream's `LICENSE` sits next to this file.

The plugin has no code. omp discovers its skills and agents on its own, every skill runs as `/skill:<skill-id>`, and each pstack role runs as its own task agent.

## Install

```sh
omp plugin marketplace add luizbafilho/open-pstack
omp plugin install pstack@open-pstack
```

pstack's settings live in their own config overlay, `~/.omp/agent/pstack.yml`, so nothing else that writes `config.yml` can overwrite them. omp reads an overlay only when `PI_CONFIG_FILES` lists it, and it refuses to start when a listed file is missing. Create the file before you export the variable. Copy the defaults from this directory:

```sh
cp ~/.omp/plugins/node_modules/open-pstack-omp/pstack.yml ~/.omp/agent/pstack.yml
export PI_CONFIG_FILES="$HOME/.omp/agent/pstack.yml"   # add this to your shell profile
```

The defaults set the two settings pstack's playbooks need:

- `task.maxRecursionDepth: 3`, because the Orchestrate playbook spawns subagents three levels deep.
- `task.isolation.enabled: true`, because `/skill:swarm` runs each writing worker with `isolated: true`.

If you provision your omp config from dotfiles, track `pstack.yml` there and symlink it into `~/.omp/agent/`. `/skill:setup-pstack` writes through the link, so its changes land in your dotfiles as a diff you can commit.

## Models

pstack spawns one task agent per role. Each agent's `model` list is `@pstack-<role>` followed by upstream's default, so omp uses `modelRoles.pstack-<role>` when it's set and the default otherwise. The routed skills use:

| Agents | Role |
|---|---|
| `poteto-agent-feature`, `-bug-fix`, `-perf-issue`, `-hillclimb`, `-judgment`, `-hardest` | poteto-mode's code delegates, prose and judgment |
| `pstack-how-explorer`, `pstack-how-explainer` | `/skill:how` (read-only) |
| `pstack-why-investigator`, `pstack-why-synthesizer` | `/skill:why` |
| `pstack-reflect-tooling`, `pstack-reflect-judgment` | `/skill:reflect` |
| `pstack-arena-runner-1..3`, `pstack-arena-judge-1..3` | `/skill:arena` runners and its read-only cross-judge |
| `pstack-architect-runner-1..3` | `/skill:architect` |
| `pstack-interrogate-reviewer-1..3` | `/skill:interrogate` (read-only) |
| `pstack-swarm-worker` | `/skill:swarm` |

`poteto-agent` itself runs on the parent chat model, and `comment-sicko` serves `/skill:no-comments`.

Run `/skill:setup-pstack` to choose the models. It lists your models with `omp models`, asks for a reasoning budget, and rewrites `~/.omp/agent/pstack.yml` with one key per role. A panel gets one key per seat, up to three. A role set to `inherit-parent` or `auto` is written as `"@default"` and runs on the parent chat model. omp re-reads the overlay before every spawn, so a change applies to the next subagent without a restart.

## Always-on poteto-mode

omp has no equivalent of the original editor's custom mode. Start each task with `/skill:poteto-mode`.
