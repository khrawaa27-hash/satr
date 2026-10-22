import { stabilize } from "./stabilize.js"

const lead = document.querySelector("#lead")
lead.textContent = stabilize(lead.textContent.trim()).fixed

const toggle = document.querySelector("#enabled")
chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
  toggle.checked = enabled !== false
})
toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked })
})

const input = document.querySelector("#input")
const copyButton = document.querySelector("#copy")
copyButton.addEventListener("click", async () => {
  const fixed = stabilize(input.value).fixed
  if (!fixed) return
  await navigator.clipboard.writeText(fixed)
  copyButton.textContent = "اننسخت"
  setTimeout(() => {
    copyButton.textContent = "انسخ النص الجاهز"
  }, 1200)
})
