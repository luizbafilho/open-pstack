import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Upstream } from "./types"

const repo = "cursor/plugins"
const path = "pstack"
const root = join(import.meta.dir, "..")
const snapshotDir = join(root, "upstream", path)
const upstreamFile = join(root, "upstream", "UPSTREAM.json")

async function git(cwd: string, ...args: string[]): Promise<void> {
  const proc = Bun.spawn(["git", ...args], { cwd, stdout: "inherit", stderr: "inherit" })
  const code = await proc.exited
  if (code !== 0) throw new Error(`git ${args.join(" ")} exited ${code}`)
}

async function latestSha(): Promise<string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const res = await fetch(`https://api.github.com/repos/${repo}/commits?path=${path}&per_page=1`, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  const commits = (await res.json()) as { sha: string }[]
  const sha = commits[0]?.sha
  if (!sha) throw new Error(`no commits found under ${repo}/${path}`)
  return sha
}

const sha = process.argv[2] ?? (await latestSha())
const tmp = await mkdtemp(join(tmpdir(), "open-pstack-"))
try {
  await git(tmp, "clone", "--filter=blob:none", "--no-checkout", `https://github.com/${repo}`, "src")
  const checkout = join(tmp, "src")
  await git(checkout, "sparse-checkout", "set", path)
  await git(checkout, "checkout", sha)

  await rm(snapshotDir, { recursive: true, force: true })
  await cp(join(checkout, path), snapshotDir, { recursive: true })

  const plugin = (await Bun.file(join(snapshotDir, ".cursor-plugin", "plugin.json")).json()) as { version: string }
  const previous = (await Bun.file(upstreamFile).exists())
    ? ((await Bun.file(upstreamFile).json()) as Upstream)
    : undefined
  const upstream: Upstream = {
    repo,
    path,
    sha,
    version: plugin.version,
    syncedAt: previous?.sha === sha ? previous.syncedAt : new Date().toISOString(),
  }
  await Bun.write(upstreamFile, `${JSON.stringify(upstream, null, 2)}\n`)
} finally {
  await rm(tmp, { recursive: true, force: true })
}

console.log(sha)
