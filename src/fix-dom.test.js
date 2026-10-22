import assert from "node:assert/strict"
import test from "node:test"
import { parseHTML } from "linkedom"
import { fixRoot, restoreRoot } from "./fix-dom.js"

test("Arabic paragraphs become rtl and code stays untouched", () => {
  const { document } = parseHTML(`<html><body>
    <p>جربت Claude Code اليوم</p>
    <pre><code>const github = true</code></pre>
  </body></html>`)
  fixRoot(document.body)
  assert.equal(document.querySelector("p").getAttribute("dir"), "rtl")
  assert.equal(document.querySelector("code").getAttribute("dir"), null)
  assert.equal(document.querySelector("pre").getAttribute("dir"), null)
  assert.equal(document.body.getAttribute("dir"), null)
})

test("a message bubble gets the direction, not the whole page", () => {
  const { document } = parseHTML(`<html><body>
    <main>
      <div class="bubble"><span>ينقلب على X وGitHub ومنصات التواصل</span></div>
      <p>Hello only</p>
    </main>
  </body></html>`)
  fixRoot(document.body)
  assert.equal(document.querySelector("main").getAttribute("dir"), null)
  assert.equal(document.querySelector(".bubble").getAttribute("dir"), "rtl")
  assert.equal(document.querySelector("p").getAttribute("dir"), null)
})

test("typing boxes with Arabic become rtl and can be restored", () => {
  const { document } = parseHTML(`<html><body>
    <textarea>جربت X اليوم</textarea>
    <textarea>English only</textarea>
  </body></html>`)
  const [arabic, english] = document.querySelectorAll("textarea")
  fixRoot(document.body)
  assert.equal(arabic.getAttribute("dir"), "rtl")
  assert.equal(english.getAttribute("dir"), null)
  restoreRoot(document.body)
  assert.equal(arabic.getAttribute("dir"), null)
})
