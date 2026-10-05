import { chmod, rm } from "node:fs/promises"
import { join } from "node:path"
import type { FileMap } from "./types"

export async function emit(files: FileMap, outDir: string): Promise<void> {
  await rm(outDir, { recursive: true, force: true })
  for (const path of [...files.keys()].sort()) {
    const content = files.get(path)!
    const target = join(outDir, path)
    await Bun.write(target, content)
    if (typeof content === "string" && content.startsWith("#!")) await chmod(target, 0o755)
  }
}
