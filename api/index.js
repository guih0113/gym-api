const { app } = require('../build/app')

let appReadyPromise = null

async function ensureAppReady() {
  if (!appReadyPromise) {
    appReadyPromise = Promise.resolve(app.ready()).then(() => undefined)
  }
  await appReadyPromise
}

module.exports = async function handler(req, res) {
  await ensureAppReady()
  app.server.emit('request', req, res)
}