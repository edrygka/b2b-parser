'use strict'

const { Pool } = require('pg')
const crypto = require('crypto')
const logger = require('./logger')('Postgres')

const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.DB_PASS
const DB_NAME = process.env.DB_NAME

const connectionString = `postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`

exports.saveToDatabase = async (agentsInfo) => {
  logger.info('Trying connect to db')
  const pool = new Pool({
    connectionString: connectionString,
  })

  logger.info('Saving agents to database...')
  for (let i = 0; i < agentsInfo.length; i++) {
    const existingAgent = (await pool.query('SELECT * FROM agentsinfo WHERE agentid = $1',
      [ agentsInfo[i].agentId ])).rows[0]

    logger.debug(agentsInfo[i], 'Pretends to be saved in database')
    // Creating hashsum to check changes 
    const agentHash = crypto.createHash('md5').update(JSON.stringify(agentsInfo[i])).digest('hex')
    // If Agent already exist and was changed - update this record in db
    if (existingAgent && agentHash !== existingAgent.hashsum) {
      logger.debug('Agent exist but changed, going to update record in db')
      await pool.query('UPDATE agentsinfo SET (name, phone, city, rang, oborot, ' + 
        'ownInvests, lastDateBuy, clientInvests, agents1Level, agentsInNetwork, ' + 
        'oborotInMonth, hashsum) = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ' + 
        '$12) WHERE agentid = $13', 
        [ agentsInfo[i].name, agentsInfo[i].phone, agentsInfo[i].city, agentsInfo[i].rang, 
          Number(agentsInfo[i].oborot), Number(agentsInfo[i].ownInvests), agentsInfo[i].lastDateBuy, 
          Number(agentsInfo[i].clientInvests), agentsInfo[i].agents1Level, agentsInfo[i].agentsInNetwork, 
          Number(agentsInfo[i].oborotInMonth), agentHash, agentsInfo[i].agentId ])
    }

    if (existingAgent && agentHash === existingAgent.hashsum) {
      logger.debug('Agent exist but not changed, do nothing')
    }

    // If this agent not exist - create new record and write in db
    if (!existingAgent) {
      logger.debug('Agent not exist, going to save record in db')
      await pool.query('INSERT INTO agentsinfo(agentid, name, phone, city, rang, ' +
      'oborot, ownInvests, lastDateBuy, clientInvests, agents1Level, agentsInNetwork, ' + 
      'oborotInMonth, hashsum) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)', 
      [ agentsInfo[i].agentId, agentsInfo[i].name, agentsInfo[i].phone, agentsInfo[i].city, agentsInfo[i].rang,
        Number(agentsInfo[i].oborot), Number(agentsInfo[i].ownInvests), agentsInfo[i].lastDateBuy, Number(agentsInfo[i].clientInvests),
        agentsInfo[i].agents1Level, agentsInfo[i].agentsInNetwork, Number(agentsInfo[i].oborotInMonth), agentHash ])
    }
  }
  logger.info('Saving completed')

  await pool.end()
  logger.debug('Connection to db closed')
  
}
