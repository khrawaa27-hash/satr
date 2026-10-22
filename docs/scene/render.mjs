// Renders the demo scenes with headless Chrome, then builds the video, GIF, and README image.
// Usage: node docs/scene/render.mjs
import { execFile, spawnSync } from "node:child_process"
import { createServer } from "node:http"
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { extname, join, normalize } from "node:path"

const ROOT = join(import.meta.dirname, "..", "..")
const OUT = join(ROOT, "docs")
const FRAMES = join(tmpdir(), "satr-frames")
const SCENES = ["intro", "before", "blank", "after", "pair", "outro"]

const BROWSERS = [
  process.env.CHROME,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean)

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
}

function serve() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname)
    let file = normalize(join(ROOT, path))
    if (!file.startsWith(ROOT)) return res.writeHead(403).end()
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html")
    if (!existsSync(file)) return res.writeHead(404).end()
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" })
    res.end(readFileSync(file))
  })
  return new Promise((resolve) => server.listen(0, () => resolve(server)))
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" })
  if (result.status !== 0) throw new Error(`${cmd} failed\n${result.stderr}`)
}

/** The local server shares this event loop, so the browser must not be run synchronously. */
function runAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 60000 }, (error) => (error ? reject(error) : resolve()))
  })
}

const browser = BROWSERS.find((path) => existsSync(path))
if (!browser) throw new Error("Set CHROME to a Chrome or Edge executable.")

rmSync(FRAMES, { recursive: true, force: true })
mkdirSync(FRAMES, { recursive: true })

const server = await serve()
const port = server.address().port
for (const scene of SCENES) {
  await runAsync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    "--window-size=1920,1080",
    "--virtual-time-budget=6000",
    `--user-data-dir=${join(FRAMES, "profile")}`,
    `--screenshot=${join(FRAMES, `${scene}.png`)}`,
    `http://localhost:${port}/docs/scene/?scene=${scene}`,
  ])
}
server.close()

const f = (scene) => join(FRAMES, `${scene}.png`)
const still = (seconds, scene) => ["-loop", "1", "-framerate", "30", "-t", String(seconds), "-i", f(scene)]
const push = (z) =>
  `zoompan=z='${z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30,setsar=1,format=yuv420p`
const flat = "scale=1920:1080:flags=lanczos,setsar=1,fps=30,format=yuv420p"

// Intro 2.8s, before 3.8s, after 4.2s, pair 3.6s, outro 3.2s with short transitions.
run("ffmpeg", [
  "-y",
  ...still(2.8, "intro"),
  ...still(3.8, "before"),
  ...still(0.7, "blank"),
  ...still(4.2, "after"),
  ...still(3.6, "pair"),
  ...still(3.2, "outro"),
  "-filter_complex",
  [
    `[0:v]${push("1+0.035*on/84")}[i]`,
    `[1:v]${flat}[b]`,
    `[2:v]${flat}[e]`,
    `[3:v]${flat}[a]`,
    `[4:v]${flat}[p]`,
    `[5:v]${push("1.035-0.035*on/96")}[o]`,
    `[i][b]xfade=transition=fade:duration=0.6:offset=2.2[x1]`,
    `[x1][e]xfade=transition=fade:duration=0.35:offset=5.65[x2]`,
    `[x2][a]xfade=transition=fade:duration=0.35:offset=6.0[x3]`,
    `[x3][p]xfade=transition=fade:duration=0.6:offset=9.6[x4]`,
    `[x4][o]xfade=transition=fade:duration=0.6:offset=12.6,format=yuv420p[v]`,
  ].join(";"),
  "-map",
  "[v]",
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  "16",
  "-tune",
  "stillimage",
  "-profile:v",
  "high",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  join(OUT, "demo.mp4"),
])

// README loop: before, text fades out, fixed text fades in, then back to before.
const gif = "scale=1200:-2:flags=lanczos,fps=15,setsar=1"
run("ffmpeg", [
  "-y",
  ...still(2.6, "before"),
  ...still(0.6, "blank"),
  ...still(3.2, "after"),
  ...still(0.6, "blank"),
  ...still(0.8, "before"),
  "-filter_complex",
  [
    `[0:v]${gif}[b]`,
    `[1:v]${gif}[e1]`,
    `[2:v]${gif}[a]`,
    `[3:v]${gif}[e2]`,
    `[4:v]${gif}[c]`,
    `[b][e1]xfade=transition=fade:duration=0.35:offset=2.25[x1]`,
    `[x1][a]xfade=transition=fade:duration=0.35:offset=2.5[x2]`,
    `[x2][e2]xfade=transition=fade:duration=0.35:offset=5.35[x3]`,
    `[x3][c]xfade=transition=fade:duration=0.35:offset=5.6,split[s0][s1]`,
    `[s0]palettegen=max_colors=192:stats_mode=full[pal]`,
    `[s1][pal]paletteuse=dither=sierra2_4a`,
  ].join(";"),
  "-loop",
  "0",
  join(OUT, "demo.gif"),
])

run("ffmpeg", ["-y", "-i", f("pair"), "-vf", "scale=1920:-2:flags=lanczos", join(OUT, "compare.png")])
run("ffmpeg", ["-y", "-i", f("after"), "-vf", "scale=1280:-2:flags=lanczos", join(OUT, "preview.png")])

for (const name of ["demo.mp4", "demo.gif", "compare.png", "preview.png"]) {
  console.log(name, statSync(join(OUT, name)).size)
}
