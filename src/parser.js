'use strict'

const puppeteer = require('puppeteer')
const Promise = require("bluebird")
const wrapper = require('./wrapper')
const db = require('./db')

module.exports = class ParsingB2B {

  async start () {
    try {
      const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] })
      this.page = await browser.newPage()
      console.log('Going to https://my.b2b.jewelry/')
      await this.page.goto('https://my.b2b.jewelry/', { waitUntil: 'networkidle2' })
      await this.page.waitForNavigation()
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  }

  async auth () {
    try {
      // Input credentials to authorize parser
      console.log('Started authorization step')
      // Choose ua phone format 
      await this.page.evaluate(() => {
        document.querySelectorAll('.dropdown-item').forEach(value => {
          if (value.getAttribute('data-country') === 'ua') value.click()
        })
      })
      await this.page.type('#phone', process.env.B2B_LOGIN)
      await this.page.type('input[name=password]', process.env.B2B_PASS)
      await this.page.waitFor(1000)
      await this.page.click('button.btn.btn-theme')
      await this.page.waitForSelector('div.page-wrap', { timeout: 1000 * 60 * 2 }) // waiting for 2 minutes
      return true
    } catch (err) {
      console.log(err)
      return false
    }
    
  }

  async parse () {
    // Go to networks page
    console.log('Going to https://my.b2b.jewelry/network')
    await this.page.goto('https://my.b2b.jewelry/network', { waitUntil: 'networkidle2' })
    await this.page.waitForSelector('#network-data')

    const maxPageNum = await wrapper.getMaxPageNum(this.page)
    console.log(`${maxPageNum} Pages we are going to parse`)
    for (let i = 0; i < maxPageNum; i++) {
      if (i > 5) {
        await wrapper.clickToPage(this.page, 4)
      } else if (i === maxPageNum) {
        await wrapper.clickToPage(this.page, 6)
      } else {
        await wrapper.clickToPage(this.page, i)
      }
      await Promise.delay(2000)
      const currentPageNum = await wrapper.getCurrentPage(this.page)
      console.log(`Parser now on page ${currentPageNum}`)

      try {
        const agentDataPerPage = []
        const agentIds = await wrapper.getAgentsId(this.page)

        for (let j = 0; j < agentIds.length; j++) {
  
          await wrapper.openAgentInfoWindow(this.page, agentIds[j])
          agentDataPerPage.push(await wrapper.getAgentInfo(this.page, agentIds[j]))
          await wrapper.quitAgentInfoWindow(this.page)
          
        }
        console.log(`Parsed ${agentDataPerPage.length} agents(mostly should be equal to 12)`)
        await db.saveToDatabase(agentDataPerPage)
      } catch (err) {
        console.log(`Data ${JSON.stringify(agentDataPerPage)} proceed with error: ${err}`)
      }
    }
    return true
  }
}

