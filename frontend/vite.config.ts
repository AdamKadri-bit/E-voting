import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Production hardening for the voter-facing bundle:
 *  - a strict Content-Security-Policy (no inline scripts, no third-party
 *    origins; only this site and the API),
 *  - Subresource Integrity (sha384) on every script and stylesheet tag,
 *  - dist/crypto-bundle.json: SHA-256 of the crypto Web Worker (the code that
 *    encrypts ballots) and of every emitted file, which the bulletin board
 *    publishes so anyone can rebuild and compare (scripts/reproducible-build.sh).
 * Dev mode is untouched: Vite's HMR needs inline scripts.
 */
function hardenBuild(apiUrl: string): Plugin {
  const apiOrigin = (() => {
    try {
      return new URL(apiUrl).origin
    } catch {
      return ''
    }
  })()
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "worker-src 'self'",
    // React applies inline style attributes; injected <style> blocks remain in a few legacy pages.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  let outDir = 'dist'
  return {
    name: 'evote-harden-build',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
      },
    },
    closeBundle() {
      const dist = resolve(outDir)
      const assets = join(dist, 'assets')
      const files = readdirSync(assets).sort()
      const sha = (buf: Buffer, alg: 'sha256' | 'sha384', enc: 'hex' | 'base64') => createHash(alg).update(buf).digest(enc)

      let html = readFileSync(join(dist, 'index.html'), 'utf8')
      html = html.replace(/<(script|link)([^>]*?)(src|href)="\/assets\/([^"]+)"([^>]*)>/g, (tag, el, pre, attr, file, post) => {
        if (tag.includes('integrity=')) return tag
        const integrity = 'sha384-' + sha(readFileSync(join(assets, file)), 'sha384', 'base64')
        const cross = tag.includes('crossorigin') ? '' : ' crossorigin'
        return `<${el}${pre}${attr}="/assets/${file}"${post} integrity="${integrity}"${cross}>`
      })
      writeFileSync(join(dist, 'index.html'), html)

      const worker = files.find((f) => /^worker-.*\.js$/.test(f))
      if (!worker) throw new Error('Crypto worker chunk not found in build output')
      const manifest = {
        file: `assets/${worker}`,
        sha256: sha(readFileSync(join(assets, worker)), 'sha256', 'hex'),
        index_html_sha256: sha(readFileSync(join(dist, 'index.html')), 'sha256', 'hex'),
        files: Object.fromEntries(files.map((f) => [`assets/${f}`, sha(readFileSync(join(assets, f)), 'sha256', 'hex')])),
      }
      writeFileSync(join(dist, 'crypto-bundle.json'), JSON.stringify(manifest, null, 2) + '\n')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), hardenBuild(env.VITE_API_URL || 'http://localhost:8000/api')],
    worker: { format: 'es' },
    build: {
      // Deterministic output for reproducible builds: no inlined timestamps,
      // content-hashed names, and the worker kept in its own named chunk.
      sourcemap: false,
      // One entry chunk on purpose: lazy chunks loaded by import() can't carry
      // SRI attributes, so everything but the worker ships in the SRI-pinned entry.
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
