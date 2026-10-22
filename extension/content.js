const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
const SKIP = "code, pre, kbd, samp, script, style, .monaco-editor, .cm-editor, .ace_editor, .blob-code, .highlight, .react-code-text"

/**
 * @param {Element | null} el
 */
function isShell(el) {
  if (!el || !el.tagName) return true
  return ["BODY", "HTML", "MAIN", "NAV", "HEADER"].includes(el.tagName)
}

/**
 * @param {Element} el
 */
function blocked(el) {
  return Boolean(el.closest && el.closest(SKIP))
}

/**
 * @param {Element} el
 */
function isEditor(el) {
  if (el.tagName === "TEXTAREA") return true
  if (el.tagName === "INPUT") {
    const type = (el.getAttribute("type") || "text").toLowerCase()
    return type === "text" || type === "search"
  }
  return el.getAttribute("contenteditable") === "true" || el.getAttribute("contenteditable") === ""
}

/**
 * @param {Element} el
 */
function editorText(el) {
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value || el.textContent || ""
  return el.textContent || ""
}

/**
 * @param {Text} textNode
 */
function targetFor(textNode) {
  let el = textNode.parentElement
  if (!el || blocked(el) || isShell(el) || isEditor(el)) return null
  while (el.parentElement && !isShell(el.parentElement) && !blocked(el.parentElement)) {
    const parent = el.parentElement
    if (parent.querySelector("button, input, textarea, select, nav")) break
    if ((parent.textContent || "").trim() !== (el.textContent || "").trim()) break
    el = parent
  }
  if (isShell(el) || blocked(el)) return null
  return el
}

/**
 * @param {Element} el
 */
function mark(el) {
  if (!el || el.dataset.satr === "1" || el.getAttribute("dir") === "rtl") return
  el.dataset.satrPrev = el.hasAttribute("dir") ? el.getAttribute("dir") || "" : ""
  el.setAttribute("dir", "rtl")
  el.dataset.satr = "1"
}

/**
 * Set dir=rtl on Arabic paragraphs and editors. Code blocks stay left-to-right.
 * @param {ParentNode} root
 */
function fixRoot(root) {
  if (!root || root.nodeType !== 1) return 0
  let count = 0
  const walk = (node) => {
    if (node.nodeType === 3) {
      if (!ARABIC.test(node.nodeValue || "")) return
      const el = targetFor(node)
      if (!el) return
      const before = el.dataset.satr
      mark(el)
      if (el.dataset.satr === "1" && before !== "1") count += 1
      return
    }
    if (node.nodeType !== 1) return
    if (blocked(node)) return
    if (isEditor(node)) {
      if (ARABIC.test(editorText(node))) {
        const before = node.dataset.satr
        mark(node)
        if (node.dataset.satr === "1" && before !== "1") count += 1
      }
      return
    }
    for (const child of node.childNodes) walk(child)
  }
  walk(root)
  return count
}

/**
 * @param {ParentNode} root
 */
function restoreRoot(root) {
  if (!root || !root.querySelectorAll) return
  const marked = [...root.querySelectorAll("[data-satr='1']")]
  if (root.matches?.("[data-satr='1']")) marked.unshift(root)
  for (const el of marked) {
    if (el.dataset.satrPrev) el.setAttribute("dir", el.dataset.satrPrev)
    else el.removeAttribute("dir")
    delete el.dataset.satr
    delete el.dataset.satrPrev
  }
}

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
