import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import { Plugin, Skill } from "@opencode/plugin"
import { parse } from "yaml"

const modelsFile = join(homedir(), ".config", "opencode", "pstack-models.md")
const frontmatter = /^---\n([\s\S]*?\n)---\n/

type SkillFile = { id: string; description?: string; autoinvoke: boolean; path: string; content: string }

async function loadSkills(): Promise<SkillFile[]> {
  const paths = await Array.fromAsync(new Bun.Glob("skills/*/SKILL.md").scan({ cwd: import.meta.dir, absolute: true }))
  return Promise.all(
    paths.sort().map(async (path) => {
      const text = await Bun.file(path).text()
      const m = frontmatter.exec(text)
      if (!m) throw new Error(`${path} has no YAML frontmatter`)
      const data = parse(m[1] ?? "") as Record<string, unknown>
      return {
        id: basename(dirname(path)),
        description: typeof data.description === "string" ? data.description : undefined,
        autoinvoke: data["disable-model-invocation"] !== true,
        path,
        content: text.slice(m[0].length),
      }
    }),
  )
}

export default Plugin.define({
  id: "open-pstack",
  async setup(ctx) {
    const skills = await loadSkills()

    await ctx.skill.transform((editor) => {
      for (const skill of skills) {
        editor.add({
          id: Skill.ID.make(skill.id),
          name: Skill.Name.make(skill.id),
          description: skill.description,
          autoinvoke: skill.autoinvoke,
          path: skill.path as Skill.Info["path"],
          content: skill.content,
        })
      }
    })

    await ctx.command.transform((editor) => {
      for (const skill of skills) {
        editor.add({
          name: skill.id,
          description: skill.description,
          async execute({ sessionID, prompt, delivery }) {
            await ctx.session.prompt({
              ...prompt,
              sessionID,
              delivery,
              skills: [...(prompt.skills ?? []), { id: Skill.ID.make(skill.id) }],
            })
          },
        })
      }
    })

    await ctx.session.hook("context", async (event) => {
      const file = Bun.file(modelsFile)
      if (await file.exists()) event.system.push({ type: "text", text: await file.text() })
    })
  },
})
