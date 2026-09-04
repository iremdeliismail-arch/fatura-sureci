import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = process.argv[2]
const outFile = process.argv[3]
if (!distDir || !outFile) {
  console.error('Kullanım: node pack-html.mjs <dist-klasörü> <çıktı.html>')
  process.exit(1)
}

const htmlPath = join(distDir, 'index.html')
let html = readFileSync(htmlPath, 'utf8')

const assetsDir = join(distDir, 'assets')
const files = readdirSync(assetsDir)

function escapeForInlineScript(source) {
  return source.replace(/<\/script/gi, '<\\/script')
}

for (const name of files) {
  const abs = join(assetsDir, name)
  if (name.endsWith('.css')) {
    const css = readFileSync(abs, 'utf8')
    html = html.replace(
      new RegExp(`<link[^>]+href=["'][^"']*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i'),
      () => `<style>${css}</style>`,
    )
  }
  if (name.endsWith('.js')) {
    const js = escapeForInlineScript(readFileSync(abs, 'utf8'))
    html = html.replace(
      new RegExp(`<script[^>]+src=["'][^"']*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*><\\/script>`, 'i'),
      () => `<script type="module">${js}</script>`,
    )
  }
}

html = html.replace(/<link rel="icon"[^>]*>\s*/i, '')

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, html, 'utf8')
console.log('Yazıldı:', outFile)
