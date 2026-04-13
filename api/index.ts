import type { VercelRequest, VercelResponse } from '@vercel/node'
import { app } from '../src/app'

let appReadyPromise: Promise<void> | null = null

async function ensureAppReady() {
  if (!appReadyPromise) {
    appReadyPromise = Promise.resolve(app.ready()).then(() => undefined)
  }
  await appReadyPromise
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureAppReady()
  app.server.emit('request', req, res)
}
