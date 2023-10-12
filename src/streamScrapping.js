const {launch, getStream} = require("puppeteer-stream");
const {exec} = require("child_process");


async function scrapeStream(url) {

    // Launch the browser and open a new blank page
    const browser = await launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        timeout: 0,
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--start-maximized']
    });


    const page = await browser.newPage();

    // Navigate to the Microsoft Teams meeting URL (replace with the actual meeting URL)
    await page.goto('https://teams.live.com/meet/9468047285073?p=SgSzVMKVaL8qJ2d8');

    const screenResolution = await page.evaluate(() => {
        return {
            width: window.screen.width,
            height: window.screen.height
        };
    });

    // Set viewport resolution
    await page.setViewport({
        width: screenResolution.width,
        height: screenResolution.height,
    });

    const newPageTarget = await browser.waitForTarget(target => target.url() === 'https://teams.live.com/_#/modern-calling/');
    const newPage = await newPageTarget.page();

    let participantsButton = '#roster-button'

    // Handling the iFrames
    const iframe = await newPage.$("iframe")
    const iframeContentFrame = await iframe.contentFrame();

    await iframeContentFrame.waitForSelector(participantsButton);
    await iframeContentFrame.click(participantsButton);

    const participatesAmount = await iframeContentFrame.$eval('#roster-button > div > span', el => el.textContent)

    console.log(participatesAmount)

    // Select all elements with aria-describedby attribute
    const endComponent = await iframeContentFrame.$('[data-tid="app-layout-area--end"]');
    console.log(endComponent)

    // Within the endComponent, select all elements with an id attribute
    const elements = await endComponent.$$('[id]');

    // Loop through each element and extract its id attribute
    for (const element of elements) {
        const id = await element.evaluate(el => el.getAttribute('id'));
        console.log('ID:', id);
    }


}

scrapeStream('sdsd')