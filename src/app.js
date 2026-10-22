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
  "VS Code أقوى من اللي أتوقع.",
  "شوف https://github.com والسعر 120 دولار.",
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

input.value = sample
render(sample)
