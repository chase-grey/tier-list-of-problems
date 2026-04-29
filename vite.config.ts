import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import * as https from 'node:https'
import * as http from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Proxy /gas-proxy?... requests through Node.js to the GAS URL, following the
// 302 redirect that GAS uses (script.google.com → script.googleusercontent.com).
// Browser fetch/script-tag approaches all fail because Google returns text/html
// to cross-origin requests; a server-side proxy bypasses this entirely.
function gasProxyPlugin(gasBase: string) {
  return {
    name: 'gas-proxy',
    configureServer(server: any) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/gas-proxy')) return next()
        if (!gasBase) {
          res.writeHead(500)
          res.end('{"error":"VITE_API_URL not configured"}')
          return
        }

        const qs = req.url.slice('/gas-proxy'.length).replace(/^[/?]+/, '')
        const target = gasBase + (qs ? '?' + qs : '')
        const method = (req.method ?? 'GET').toUpperCase()

        // Collect request body (needed for POST requests)
        const bodyChunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => bodyChunks.push(chunk))
        req.on('end', () => {
          const body = Buffer.concat(bodyChunks)
          forward(target, method, body)
        })

        function forward(url: string, fwdMethod: string, fwdBody: Buffer, hops = 0) {
          if (hops > 10) { res.writeHead(500); res.end('{"error":"Too many redirects"}'); return }
          const parsed = new URL(url)
          const isHttps = parsed.protocol === 'https:'
          const lib = isHttps ? https : http
          // Accept-Encoding: identity prevents gzip so we don't need to decompress
          const opts: any = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: fwdMethod,
            headers: { 'Accept-Encoding': 'identity' } as Record<string, string | number>,
          }
          if (fwdMethod === 'POST' && fwdBody.length > 0) {
            opts.headers['Content-Type'] = 'application/json'
            opts.headers['Content-Length'] = fwdBody.length
          }
          const proxyReq = lib.request(opts, (proxyRes: any) => {
            const { statusCode, headers } = proxyRes
            const loc: string | undefined = headers.location
            if ((statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308) && loc) {
              proxyRes.resume()
              // Preserve method through redirects so doPost runs at the final GAS URL
              forward(loc.startsWith('http') ? loc : new URL(loc, url).href, fwdMethod, fwdBody, hops + 1)
              return
            }
            const chunks: Buffer[] = []
            proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk))
            proxyRes.on('end', () => {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
              res.end(Buffer.concat(chunks))
            })
          })
          proxyReq.on('error', (err: Error) => { res.writeHead(500); res.end(JSON.stringify({ error: err.message })) })
          if (fwdMethod === 'POST' && fwdBody.length > 0) proxyReq.write(fwdBody)
          proxyReq.end()
        }
      })
    }
  }
}

// https://vite.dev/config/
// process.env doesn't include .env file vars in vite.config; use loadEnv instead.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gasBase = env.VITE_API_URL ?? ''

  return {
    plugins: [react(), gasProxyPlugin(gasBase)],
    // Use environment variable for base URL, with fallback for production
    base: env.VITE_BASE_URL || (mode === 'production' ? '/tier-list-of-problems/' : '/'),
    build: {
      outDir: 'build',
    },
  }
})
