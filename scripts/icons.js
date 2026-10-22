import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const root = path.resolve(import.meta.dirname, "..")

/**
 * @param {number} size
 */
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      const pad = size * 0.16
      const inside = x >= pad && y >= pad && x < size - pad && y < size - pad
      const bar = x > size * 0.64 && x < size * 0.8 && y > size * 0.3 && y < size * 0.7
      const color = !inside ? [239, 230, 214, 255] : bar ? [251, 247, 240, 255] : [28, 25, 21, 255]
      const i = row + 1 + x * 4
      raw[i] = color[0]
      raw[i + 1] = color[1]
      raw[i + 2] = color[2]
      raw[i + 3] = color[3]
    }
  }
  const idat = zlib.deflateSync(raw)
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(body))
    return Buffer.concat([length, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

for (const [dir, sizes] of [
  ["icons", [192, 512]],
  ["extension/icons", [16, 48, 128]],
]) {
  const folder = path.join(root, dir)
  fs.mkdirSync(folder, { recursive: true })
  for (const size of sizes) fs.writeFileSync(path.join(folder, `${size}.png`), png(size))
}
