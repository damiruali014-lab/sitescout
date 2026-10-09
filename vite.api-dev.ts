import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'

/**
 * Local stand-in for Vercel Functions: during `npm run dev`, requests to /api/<name>
 * are routed to api/<name>.ts, which exports web-standard handlers (GET/POST).
 * On Vercel the same files run natively, so there is no `vercel dev` login needed locally.
 */
export function apiDevServer(): Plugin {
  return {
    name: 'sitescout-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const match = /^\/api\/([a-z0-9-]+)\/?$/.exec(url.pathname)
        if (!match) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`)
          const method = (req.method ?? 'GET').toUpperCase()
          const handler = mod[method] ?? mod.default?.fetch
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end('Method not allowed')
          }
          const response: Response = await handler(await toRequest(req, url))
          await sendResponse(res, response)
        } catch (err) {
          server.ssrFixStacktrace(err as Error)
          console.error(err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Dev server error: ' + (err as Error).message }))
        }
      })
    },
  }
}

async function toRequest(req: IncomingMessage, url: URL): Promise<Request> {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v)
    else if (Array.isArray(v)) headers.set(k, v.join(', '))
  }
  headers.set('x-forwarded-for', req.socket.remoteAddress ?? '127.0.0.1')
  const method = req.method ?? 'GET'
  let body: Buffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    body = Buffer.concat(chunks)
  }
  return new Request(new URL(url.pathname + url.search, `http://${req.headers.host ?? 'localhost'}`), {
    method,
    headers,
    body: body && body.length ? new Uint8Array(body) : undefined,
  })
}

async function sendResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}
