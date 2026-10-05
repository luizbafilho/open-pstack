# open-pstack for OpenCode

This directory is [pstack](https://github.com/cursor/plugins/tree/main/pstack), Lauren Tan's skill pack, rebuilt as an OpenCode plugin. A build script generates it from a pinned copy of upstream and rewrites the parts that only made sense in the original editor: tool names, model IDs, config paths, and the custom mode. Don't edit files here by hand. The next build overwrites them. Upstream's `LICENSE` sits next to this file.

The plugin registers every pstack skill, adds a `/<skill-id>` command for each one, and loads your model choices into every session.

## Install

Clone the repository somewhere stable and install the plugin's dependencies:

```sh
git clone https://github.com/luizbafilho/open-pstack ~/.local/share/open-pstack
cd ~/.local/share/open-pstack/dist/opencode
bun install --frozen-lockfile
```

Add the directory to `plugins` in `~/.config/opencode/opencode.json`. Use the absolute path. OpenCode treats a path that starts with `~` as a package name and logs a warning on every start.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/home/you/.local/share/open-pstack/dist/opencode"]
}
```

The plugin API can't register agents, so link the three agent files into your agents directory:

```sh
mkdir -p ~/.config/opencode/agents
ln -sf ~/.local/share/open-pstack/dist/opencode/agents/*.md ~/.config/opencode/agents/
```

That adds `poteto-agent` and `comment-sicko`, which pstack's skills spawn as subagents, and `poteto`, a primary agent that keeps `/poteto-mode` on for every turn.

The skills read their playbooks and scripts from this directory, which sits outside your projects, so OpenCode asks before the first read. Approve it with "always", or allow it up front:

```jsonc
{
  "permissions": [
    { "action": "external_directory", "resource": "/home/you/.local/share/open-pstack/*", "effect": "allow" }
  ]
}
```

## Models

pstack reads its per-role models from `~/.config/opencode/pstack-models.md`. Run `/setup-pstack` to write it. The skill lists your models, asks for a reasoning budget, and writes one line per role. Without the file, every role uses the default model its skill names. The plugin reads the file on each model request, so edits apply to the next message without a restart.
