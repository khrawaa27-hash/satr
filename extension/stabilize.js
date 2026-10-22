/** Right-to-left isolate. Forces RTL order inside an LTR page. */
export const RLI = "\u2067"
/** Left-to-right isolate. Keeps an English run in its own order. */
export const LRI = "\u2066"
/** Pop directional isolate. Closes RLI and LRI. */
export const PDI = "\u2069"
/** Right-to-left mark. Survives some sites that strip isolates. */
export const RLM = "\u200F"

const CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g
const OVERRIDE = /[\u202A-\u202E]/

/**
 * Remove bidi controls so a second pass cannot nest marks inside marks.
 * @param {string} text
 */
export function stripMarks(text) {
  return text.replace(CONTROLS, "")
}

/**
 * @param {number} cp
 */
function isArabic(cp) {
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  )
}

/**
 * @param {number} cp
 */
function isLatinLetter(cp) {
  return (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)
}

/**
 * @param {number} cp
 */
function isAsciiDigit(cp) {
  return cp >= 0x30 && cp <= 0x39
}

/**
 * @param {number} cp
 */
function kind(cp) {
  if (isArabic(cp)) return "ar"
  if (isLatinLetter(cp) || isAsciiDigit(cp)) return "en"
  return "neutral"
}

/**
 * Punctuation that may sit inside an English token, such as example.com or Claude Code.
 * Sentence marks stay outside the token.
 * @param {number} cp
 */
function isBridge(cp) {
  return (
    cp === 0x20 ||
    cp === 0x09 ||
    cp === 0x2e || // .
    cp === 0x5f || // _
    cp === 0x2d || // -
    cp === 0x2b || // +
    cp === 0x23 || // #
    cp === 0x40 || // @
    cp === 0x2f || // /
    cp === 0x3a || // :
    cp === 0x7e || // ~
    cp === 0x25 || // %
    cp === 0x26 || // &
    cp === 0x3d || // =
    cp === 0x3f || // ?
    cp === 0x2c // ,
  )
}

/**
 * @param {string} line
 */
function charsOf(line) {
  return Array.from(line).map((ch) => ({ ch, cp: ch.codePointAt(0) }))
}

/**
 * @param {{ cp: number }[]} chars
 * @param {number} j
 * @returns {number | null} index of the next English char if this neutral sequence belongs to it
 */
function bridgeToEn(chars, j) {
  let p = j
  while (p < chars.length && kind(chars[p].cp) === "neutral" && isBridge(chars[p].cp)) {
    p += 1
  }
  if (p > j && p < chars.length && kind(chars[p].cp) === "en") return p
  return null
}

/**
 * @param {string} line
 * @returns {{ kind: "ar" | "en" | "neutral", text: string }[]}
 */
function scan(line) {
  const chars = charsOf(line)
  /** @type {{ kind: "ar" | "en" | "neutral", text: string }[]} */
  const tokens = []
  let i = 0
  while (i < chars.length) {
    const k = kind(chars[i].cp)
    if (k === "ar" || k === "en") {
      let j = i + 1
      while (j < chars.length) {
        if (kind(chars[j].cp) === k) {
          j += 1
          continue
        }
        if (k === "en") {
          const next = bridgeToEn(chars, j)
          if (next !== null) {
            j = next
            continue
          }
        }
        break
      }
      tokens.push({ kind: k, text: chars.slice(i, j).map((c) => c.ch).join("") })
      i = j
      continue
    }
    let j = i + 1
    while (j < chars.length && kind(chars[j].cp) === "neutral") j += 1
    tokens.push({ kind: "neutral", text: chars.slice(i, j).map((c) => c.ch).join("") })
    i = j
  }
  return tokens
}

/**
 * @param {string} line
 * @returns {"ar" | "en" | "neutral"}
 */
function firstStrong(line) {
  for (const ch of Array.from(line)) {
    const cp = ch.codePointAt(0)
    if (isArabic(cp)) return "ar"
    if (isLatinLetter(cp)) return "en"
  }
  return "neutral"
}

/**
 * @param {string} line
 */
function leadingEnglishPhrase(line) {
  return scan(line).find((token) => token.kind === "en")?.text ?? "English"
}

/**
 * @param {string} line
 * @returns {{ fixed: string, warnings: string[] }}
 */
export function stabilizeLine(line) {
  const clean = stripMarks(line)
  if (!Array.from(clean).some((ch) => isArabic(ch.codePointAt(0)))) {
    return { fixed: clean, warnings: [] }
  }

  let body = ""
  for (const token of scan(clean)) {
    if (token.kind === "en") body += LRI + token.text + PDI + RLM
    else body += token.text
  }

  const warnings = []
  if (firstStrong(clean) === "en") {
    warnings.push(
      `يبدأ بـ «${leadingEnglishPhrase(clean)}»، فثبّتناه حتى لا يسحب السطر كله إلى اليسار.`,
    )
  }

  return { fixed: RLI + RLM + body + PDI, warnings }
}

/**
 * @param {string} text
 * @returns {{ fixed: string, lines: { number: number, warnings: string[] }[] }}
 */
export function stabilize(text) {
  const parts = text.split("\n")
  /** @type {{ number: number, warnings: string[] }[]} */
  const lines = []
  const fixed = parts
    .map((line, index) => {
      const result = stabilizeLine(line)
      if (result.warnings.length > 0) {
        lines.push({ number: index + 1, warnings: result.warnings })
      }
      return result.fixed
    })
    .join("\n")

  if (OVERRIDE.test(fixed)) {
    throw new Error("stabilize emitted a bidi override")
  }

  return { fixed, lines }
}

/**
 * Show invisible marks as readable labels.
 * @param {string} text
 */
export function showMarks(text) {
  return text
    .replaceAll(RLI, "‹RLI›")
    .replaceAll(LRI, "‹LRI›")
    .replaceAll(PDI, "‹PDI›")
    .replaceAll(RLM, "‹RLM›")
    .replaceAll("\u200E", "‹LRM›")
    .replaceAll("\u202E", "‹RLO›")
}
