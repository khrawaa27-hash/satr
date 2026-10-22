import { showMarks, stabilize } from "./stabilize.js"

const input = document.querySelector("#input")
const before = document.querySelector("#before")
const after = document.querySelector("#after")
const warnings = document.querySelector("#warnings")
const marks = document.querySelector("#marks")
const marksToggle = document.querySelector("#marks-toggle")
const copyButton = document.querySelector("#copy")
const sampleButton = document.querySelector("#sample")

const sample = [
  "جربت Claude Code اليوم!",
  "ينقلب على X وGitHub ومنصات التواصل وكافة المواقع الأخرى.",
  "VS Code أقوى من اللي أتوقع.",
].join("\n")

/**
 * @param {string} text
 */
function render(text) {
  const { fixed, lines } = stabilize(text)
  before.textContent = text
  after.textContent = fixed
  marks.textContent = showMarks(fixed)

  warnings.replaceChildren()
  if (lines.length === 0) {
    const empty = document.createElement("p")
    empty.className = "quiet"
    empty.textContent = text.trim()
      ? "ما في سطر يبدأ بكلمة إنجليزية."
      : "الصق منشوراً، أو جرّب المثال."
    warnings.append(empty)
  } else {
    for (const line of lines) {
      const item = document.createElement("p")
      item.textContent = `سطر ${line.number}: ${line.warnings.join(" ")}`
      warnings.append(item)
    }
  }

  copyButton.dataset.fixed = fixed
}

input.addEventListener("input", () => render(input.value))

marksToggle.addEventListener("change", () => {
  marks.hidden = !marksToggle.checked
})

copyButton.addEventListener("click", async () => {
  const fixed = copyButton.dataset.fixed ?? ""
  if (!fixed) return
  try {
    await navigator.clipboard.writeText(fixed)
  } catch {
    const holder = document.createElement("textarea")
    holder.value = fixed
    document.body.append(holder)
    holder.select()
    document.execCommand("copy")
    holder.remove()
  }
  copyButton.textContent = "اننسخت"
  setTimeout(() => {
    copyButton.textContent = "انسخ النص الجاهز"
  }, 1200)
})

sampleButton.addEventListener("click", () => {
  input.value = sample
  render(sample)
  input.focus()
})

for (const node of document.querySelectorAll("[data-stabilize]")) {
  node.textContent = stabilize(node.textContent.trim()).fixed
}

const shared = new URLSearchParams(location.search)
const sharedText = [shared.get("title"), shared.get("text")].filter(Boolean).join("\n")
input.value = sharedText || sample
render(input.value)

const installNote = document.querySelector("#install-note")
const installButton = document.querySelector("#install")
const standalone =
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true
if (!standalone) installNote.hidden = false

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault()
  installButton.hidden = false
  installButton.addEventListener("click", async () => {
    await event.prompt()
  })
})

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {})
}
