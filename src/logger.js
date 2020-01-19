'use strict'

const pino = require('pino')

const logger = pino({
  prettyPrint: false,
  level: process.env.LOGGING_LEVEL || 'info'
}, pino.destination(`./logs/${Date.now()}.log`))

module.exports = (name) => logger.child({name: name})
