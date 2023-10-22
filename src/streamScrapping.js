const {launch, getStream} = require("puppeteer-stream");
const {exec} = require("child_process");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const logger = require('./logger');


const csvFilePath = 'personData.csv';
const csvWriter = createCsvWriter({
    path: csvFilePath,
    append: false, // Append records to an existing file
});


async function scrapeStream(url) {
    const browser = await launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\new_chrome.exe',
        timeout: 0,
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // Navigate to the Microsoft Teams meeting URL (replace with the actual meeting URL)
    await page.goto(url);

    const screenResolution = await page.evaluate(() => {
        return {
            width: window.screen.width,
            height: window.screen.height,
        };
    });

    await page.setViewport({
        width: screenResolution.width,
        height: screenResolution.height,
    });

    const newPageTarget = await browser.waitForTarget((target) => target.url() === 'https://teams.live.com/_#/modern-calling/');
    const newPage = await newPageTarget.page();

    //MY
    await csvWriter.writeRecords({
        timestamp: 'Timestamp',
        participants: 'Participants',
        participantsAmount: 'Participants amount',
    })

    // Wait for the iframe and the button to appear
    const iframe = await newPage.waitForSelector('iframe');
    const iframeContentFrame = await iframe.contentFrame();
    const participantsButton = '#roster-button > div > span';

    await iframeContentFrame.waitForSelector(participantsButton);

    const participatesAmount = await iframeContentFrame.$eval(participantsButton, (el) => el.textContent);
    await csvWriter.writeRecords({participantsAmount: participatesAmount})


    await iframeContentFrame.click('#roster-button');
    const handleParticipantsList = await iframeContentFrame.waitForSelector('[data-tid="app-layout-area--end"]');
    const pollParticipants = async () => {

        const currentTimestamp = new Date().toISOString();
        const participants = await handleParticipantsList.$$('[data-cid="roster-participant"]');
        const participantNames = [];

        logger.debug("start scrapping participants names")
        for (const participantElement of participants) {
            const nameElement = await participantElement.$('span');
            const name = await nameElement.evaluate((element) => element.textContent.trim());
            participantNames.push(name);
        }

        logger.debug("finsh scrapping participants names")

        const data = [
            {
                timestamp: currentTimestamp,
                participants: participantNames.join(', '),
            },
        ];

        logger.debug("write data to file")
        await csvWriter.writeRecords(data);
    };

    setTimeout(() => {
        pollParticipants();
        // Poll for participants every 20 sec
        setInterval(pollParticipants, 20000);
    }, 10000);
}

scrapeStream('https://teams.live.com/meet/9464919624991?p=uxdg85lwKFWmz4eC');
