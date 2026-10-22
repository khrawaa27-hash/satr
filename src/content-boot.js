function boot(enabled) {
  if (!document.body) return
  if (enabled) fixRoot(document.body)
  else restoreRoot(document.body)
}

chrome.storage.local.get({ enabled: true }, ({ enabled }) => boot(enabled !== false))

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.enabled) return
  boot(changes.enabled.newValue !== false)
})

let timer
const observer = new MutationObserver(() => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
      if (enabled !== false && document.body) fixRoot(document.body)
    })
  }, 150)
})

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
}
