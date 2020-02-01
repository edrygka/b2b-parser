'use strict'

const puppeteer = require('puppeteer')
const Promise = require("bluebird")
const { getAgentInfo, getAgentsId, getCurrentPage, getMaxPageNum,
  clickToPage, openAgentInfoWindow, quitAgentInfoWindow } = require('./wrapper')
const db = require('./db')
const logger = require('./logger')('Parser')

module.exports = class ParsingB2B {

  async start () {
    try {
      const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] })
      this.page = await browser.newPage()
      logger.info('Going to https://my.b2b.jewelry/')
      await this.page.goto('https://my.b2b.jewelry/', { waitUntil: 'networkidle2' })
      await this.page.waitForSelector('.flag-icon.flag-icon-us.mr-1', { timeout: 1000 * 60 * 2 })
      return true
    } catch (err) {
      logger.error(err, 'Start failed with error')
      const screenshotName = new Date().toLocaleString().replace( /\s/g, '').replace(/\//g, '-')
      await this.page.screenshot({path: `logs/error-${screenshotName}.png`})
      return false
    }
  }

  async auth () {
    try {
      // Input credentials to authorize parser
      logger.info('Started authorization step')
      // Choose ua phone format 
      await this.page.evaluate(() => {
        document.querySelectorAll('.dropdown-item').forEach(value => {
          if (value.getAttribute('data-country') === 'ua') value.click()
        })
      })
      await this.page.type('#phone', process.env.B2B_LOGIN)
      await this.page.type('input[name=password]', process.env.B2B_PASS)
      await this.page.waitFor(1000)
      await this.page.click('button.btn.btn-restyle')
      await this.page.waitForSelector('div.page-wrap', { timeout: 1000 * 60 * 2 }) // waiting for 2 minutes
      return true
    } catch (err) {
      logger.error(err, 'Authentication failed with error')
      const screenshotName = new Date().toLocaleString().replace( /\s/g, '').replace(/\//g, '-')
      await this.page.screenshot({path: `logs/error-${screenshotName}.png`})
      return false
    }
    
  }

  async parse () {
    // Go to networks page
    logger.info('Going to https://my.b2b.jewelry/network')
    await this.page.goto('https://my.b2b.jewelry/network', { waitUntil: 'networkidle2' })
    await this.page.waitForSelector('#network-data')

    const maxPageNum = await getMaxPageNum(this.page)
    logger.info(`${maxPageNum} Pages we are going to parse`)
    for (let i = 0; i < maxPageNum; i++) {
      if (i > 5) {
        await clickToPage(this.page, 4)
      } else if (i === maxPageNum) {
        await clickToPage(this.page, 6)
      } else {
        await clickToPage(this.page, i)
      }
      await Promise.delay(2000)
      const currentPageNum = await getCurrentPage(this.page)
      logger.info(`Parser now on page ${currentPageNum}`)

      const agentDataPerPage = []
      try {
        const agentIds = await getAgentsId(this.page)

        for (let j = 0; j < agentIds.length; j++) {
  
          await openAgentInfoWindow(this.page, agentIds[j])
          const agentInfo = await getAgentInfo(this.page, agentIds[j])
          agentDataPerPage.push(agentInfo)
          await quitAgentInfoWindow(this.page)
          
        }
        logger.debug(`Parsed ${agentDataPerPage.length} agents(mostly should be equal to 12)`)
        await db.saveToDatabase(agentDataPerPage)
      } catch (err) {
        logger.error(err, `Data ${JSON.stringify(agentDataPerPage)} proceed with error:`)
      }
    }
    logger.info('Finished parsing process')
    return true
  }
}

