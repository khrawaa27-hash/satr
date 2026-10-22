import { stabilize } from "../../src/stabilize.js"

const POST = ["جربت Claude Code اليوم!", "🔥 أسرع من VS Code بمرتين.", "مع José بالمقهى، الحساب ١٢٠ ألف."].join("\n")

const PUNCTUATION = new Set(["!", ".", "،"])

/**
 * Fill a node with text, wrapping sentence punctuation in a highlight span.
 * Plain spans do not change bidi order, so the highlight lands where the
 * browser actually draws the mark.
 * @param {HTMLElement} node
 * @param {string} text
 */
function fill(node, text) {
  let run = ""
  for (const ch of text) {
    if (!PUNCTUATION.has(ch)) {
      run += ch
      continue
    }
    if (run) node.append(run)
    run = ""
    const mark = document.createElement("span")
    mark.className = "p"
    mark.textContent = ch
    node.append(mark)
  }
  if (run) node.append(run)
}

/** @param {"bad" | "good"} tone */
function card(tone) {
  const text = tone === "good" ? stabilize(POST).fixed : POST
  const el = document.createElement("article")
  el.className = `card ${tone}`
  el.innerHTML = `
    <header class="head">
      <div class="avatar"></div>
      <div class="who"><b>Your post</b><span>@you · now</span></div>
      <div class="where">Left-to-right page</div>
    </header>
    <p class="post"></p>
    <footer class="foot"><span>Reply</span><span>Repost</span><span>Like</span><span>Share</span></footer>`
  fill(/** @type {HTMLElement} */ (el.querySelector(".post")), text)
  return el
}

/** @param {"bad" | "good"} tone */
function chip(tone) {
  const el = document.createElement("div")
  el.className = `chip ${tone}`
  el.innerHTML =
    tone === "good"
      ? `<i></i><span>بعد سطر</span><small>After Satr</small>`
      : `<i></i><span>قبل</span><small>Before</small>`
  return el
}

/** @param {"bad" | "good"} tone */
function postScene(tone, withCaption = true) {
  const el = document.createElement("section")
  el.className = "scene"
  el.append(chip(tone), card(tone))
  if (withCaption) {
    const caption = document.createElement("p")
    caption.className = "caption"
    caption.innerHTML =
      tone === "good"
        ? `كل جملة تبدأ من اليمين، والعلامة في آخرها.<small>Each sentence reads right to left, punctuation at the end.</small>`
        : `الكلمات تتبعثر، والعلامات تطير لأول السطر.<small>Words scatter and punctuation jumps to the start.</small>`
    el.append(caption)
  }
  return el
}

function hero(closing) {
  const el = document.createElement("section")
  el.className = "hero"
  el.innerHTML = closing
    ? `<div class="logo"><span></span></div>
       <div class="tagline">الصق، انسخ، انشر.</div>
       <div class="subtitle">Paste. Copy. Post. Free and open source.</div>
       <div class="url">khrawaa27-hash.github.io/satr</div>
       <div class="pills"><span>Web</span><span>Chrome</span><span>Phone</span><span>MIT</span></div>`
    : `<div class="logo"><span></span></div>
       <div class="wordmark">سطر</div>
       <div class="tagline">العربي والإنجليزي بنفس السطر، بالترتيب الصحيح.</div>
       <div class="subtitle">Mixed Arabic and English, in the right order. On X, GitHub, and every site.</div>`
  return el
}

function pair() {
  const wrap = document.createDocumentFragment()
  const title = document.createElement("div")
  title.className = "pair-title"
  title.innerHTML = `<b>نفس المنشور، نفس الصفحة.</b><span>Same post, same left-to-right page.</span>`
  const grid = document.createElement("div")
  grid.className = "pair"
  grid.style.marginTop = "120px"
  grid.append(postScene("bad", false), postScene("good", false))
  wrap.append(title, grid)
  return wrap
}

const stage = /** @type {HTMLElement} */ (document.getElementById("stage"))
const scene = new URLSearchParams(location.search).get("scene") ?? "before"

if (scene === "intro") stage.append(hero(false))
else if (scene === "outro") stage.append(hero(true))
else if (scene === "pair") stage.append(pair())
else if (scene === "blank") {
  const empty = postScene("good")
  empty.classList.add("ghost")
  stage.append(empty)
} else stage.append(postScene(scene === "after" ? "good" : "bad"))

document.fonts.ready.then(() => {
  document.documentElement.dataset.ready = "1"
})
