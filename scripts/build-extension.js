import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const extension = path.join(root, "extension")
fs.mkdirSync(extension, { recursive: true })

const fixer = fs
  .readFileSync(path.join(root, "src", "fix-dom.js"), "utf8")
  .replace(/^export function /gm, "function ")
const boot = fs.readFileSync(path.join(root, "src", "content-boot.js"), "utf8")
fs.writeFileSync(path.join(extension, "content.js"), `${fixer}\n${boot}`)
fs.copyFileSync(path.join(root, "src", "stabilize.js"), path.join(extension, "stabilize.js"))
