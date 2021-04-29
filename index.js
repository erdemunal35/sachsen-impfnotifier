require('dotenv').config()
const { chromium } = require('playwright'),
  notifier = require('node-notifier')

const MAX_32_BIT_SIGNED_INTEGER = Math.pow(2, 31) - 1

;(async () => {
  const centres = process.env.CENTRES.split(',').map((x) => x.trim())
  const delay = parseInt(process.env.DELAY || 300000)

  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  page.setDefaultTimeout(90000)
  await page.goto(
    'https://sachsen.impfterminvergabe.de/civ.public/start.html?oe=00.00.IM&mode=cc&cc_key=IOAktion'
  )
  await page.click('button:has(span:is(:text("Weiter")))', {
    timeout: MAX_32_BIT_SIGNED_INTEGER, // Wait in queue
  })

  await page.waitForSelector('h3:is(:text("Zugangsdaten"))')
  await page.fill('text=Vorgangskennung', process.env.USER_NAME)
  await page.fill('text=Passwort', process.env.PASSWORD)
  await page.click('button:has(span:is(:text("Weiter")))')
  await page.click(
    'text=Termin zur Coronaschutzimpfung vereinbaren oder ändern'
  )
  await page.click('button:has(span:is(:text("Weiter")))')

  while (true) {
    for (let currentCentre of centres) {
      await page.waitForSelector('h3:is(:text("Vorgaben für Terminsuche"))')
      const centreSelectCombobox = await page.$(
        '[role=combobox]:near(label:is(:text("Ihr gewünschtes Impfcenter*")))'
      )
      await centreSelectCombobox.click()
      await page.click(`[role=listbox] li:is(:text("${currentCentre}"))`)
      await page.click('button:has(span:is(:text("Weiter")))')

      await Promise.race([
        page.waitForSelector('h2:is(:text("Terminauswahl"))'),
        page.waitForSelector('h2:is(:text("Terminvergabe"))'),
      ])
      const noSuccessElement = await page.$('text=/keinen\\s*Termin/i')
      if (noSuccessElement === null) {
        console.log(`SUCCESS FOR ${currentCentre}`)
        notifier.notify({
          title: 'Impftermin gefunden!',
          message: `Ein Termin für ${currentCentre} wurde gefunden!`,
        })
        return
      }
      console.log(
        `No success for ${currentCentre} (${new Date().toLocaleTimeString()})`
      )
      await page.click('button:has(span:is(:text("Zurück")))')
    }

    console.log(`Waiting for ${delay}ms`)
    await waitFor(delay)
  }
})()

async function waitFor(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}
