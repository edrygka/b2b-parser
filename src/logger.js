'use strict'

const pino = require('pino')

const logger = pino({
  prettyPrint: false
}, pino.destination(`./logs/${Date.now()}.log`))

module.exports = (name) => logger.child({name: name})
