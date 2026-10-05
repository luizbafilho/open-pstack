import { join } from "node:path"
import type { FileMap } from "./types"

const decoder = new TextDecoder("utf-8", { fatal: true })

export function isText(bytes: Uint8Array): boolean {
  if (bytes.subarray(0, 8192).includes(0)) return false
  try {
    decoder.decode(bytes)
    return true
  } catch {
    return false
  }
}

export async function loadTree(root: string): Promise<FileMap> {
  const files: FileMap = new Map()
  const paths = await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: root, dot: true }))
  for (const path of paths.sort()) {
    const bytes = await Bun.file(join(root, path)).bytes()
    files.set(path, isText(bytes) ? decoder.decode(bytes) : bytes)
  }
  return files
}
