import assert from "node:assert/strict"
import test from "node:test"
import bidiFactory from "bidi-js"
import { LRI, PDI, RLI, RLM, showMarks, stabilize, stabilizeLine, stripMarks } from "./stabilize.js"

const bidi = bidiFactory()

/**
 * Visual left-to-right order inside an LTR page, with controls removed
 * so the assertion talks about letters.
 * @param {string} text
 */
function visual(text) {
  const levels = bidi.getEmbeddingLevels(text, "ltr")
  return stripMarks(bidi.getReorderedString(text, levels))
}

/** Left-to-right dump of an Arabic word, the way a visual string stores it. */
function displayed(word) {
  return Array.from(word).reverse().join("")
}

test("mixed Arabic and English keeps reading order on an LTR page", () => {
  const input = "جربت Claude Code اليوم"
  const { fixed } = stabilizeLine(input)
  assert.equal(stripMarks(fixed), input)
  const broken = visual(input)
  const seen = visual(fixed)
  assert.equal(broken.startsWith(displayed("جربت")), true)
  assert.equal(seen.endsWith(displayed("جربت")), true)
  assert.equal(seen.startsWith(displayed("اليوم")), true)
  assert.match(seen, /Claude Code/)
})

test("punctuation stays at the end of the Arabic sentence", () => {
  const input = "جربت Claude Code اليوم!"
  const { fixed } = stabilizeLine(input)
  const seen = visual(fixed)
  assert.equal(visual(input).endsWith("!"), true)
  assert.equal(seen.startsWith("!"), true)
  assert.equal(seen.endsWith(displayed("جربت")), true)
})

test("a line that starts with English is stabilized and reported", () => {
  const input = "Claude Code أرخص اليوم"
  const { fixed, warnings } = stabilizeLine(input)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /Claude/)
  const seen = visual(fixed)
  assert.equal(seen.endsWith("Claude Code"), true)
  const cheap = seen.indexOf(displayed("أرخص"))
  const today = seen.indexOf(displayed("اليوم"))
  assert.ok(today !== -1 && cheap !== -1 && today < cheap)
})

test("pure English is unchanged and pure Arabic is wrapped", () => {
  assert.equal(stabilizeLine("Claude Code").fixed, "Claude Code")
  const arabic = stabilizeLine("مرحبا بالعالم")
  assert.equal(arabic.warnings.length, 0)
  assert.equal(arabic.fixed.startsWith(RLI + RLM), true)
  assert.equal(arabic.fixed.endsWith(PDI), true)
})

test("urls and numbers stay one left-to-right run", () => {
  const { fixed } = stabilizeLine("شوف https://github.com/foo والسعر 120")
  assert.equal(fixed.includes(`${LRI}https://github.com/foo${PDI}`), true)
  assert.equal(fixed.includes(`${LRI}120${PDI}`), true)
  assert.equal(stripMarks(fixed), "شوف https://github.com/foo والسعر 120")
})

test("running twice does not stack marks", () => {
  const once = stabilize("جربت Claude Code اليوم!").fixed
  const twice = stabilize(once).fixed
  assert.equal(twice, once)
})

test("never emits bidi overrides", () => {
  const { fixed } = stabilize("Claude!\nجربت VS Code اليوم.\nالسعر 120 دولار")
  assert.equal(/[\u202A-\u202E]/.test(fixed), false)
})

test("multiline keeps line numbers in warnings", () => {
  const { lines } = stabilize("جربت Claude اليوم\nVS Code أقوى اليوم")
  assert.deepEqual(
    lines.map((line) => line.number),
    [2],
  )
  assert.match(lines[0].warnings[0], /VS Code/)
})

test("platform names stay in an Arabic sentence", () => {
  const input = "ينقلب على X وGitHub ومنصات التواصل وكافة المواقع الأخرى."
  const { fixed } = stabilizeLine(input)
  const seen = visual(fixed)
  assert.equal(seen.endsWith(displayed("ينقلب")), true)
  assert.equal(seen.startsWith("."), true)
  assert.match(seen, /X/)
  assert.match(seen, /GitHub/)
  assert.equal(/[\u202A-\u202E]/.test(fixed), false)
})

test("showMarks is readable", () => {
  assert.match(showMarks(RLI + LRI + "A" + PDI + RLM + PDI), /‹RLI›/)
})
