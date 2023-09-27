const { launch, getStream } = require("puppeteer-stream");
const { exec } = require("child_process");

async function saveStream(url) {

    // Launch the browser and open a new blank page
    const browser = await launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome',
        timeout: 0,
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    const pages = await browser.pages();
    if (pages.length > 1) {
        await pages[0].close();
    }

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

    // Navigate the page to a URL
    await page.goto(url ? url : 'https://www.youtube.com/watch?v=pat2c33sbog1', {timeout: 0});

    const stream = await getStream(page, { audio: true, video: true, frameSize: 1000 });
    console.log("recording");

    const ffmpeg = exec(`ffmpeg -y -i - -c:v libx264 -c:a aac /home/aleksei/Study/iti0303/saved_video/output.mp4`);
    ffmpeg.stderr.on("data", (chunk) => {
        console.log(chunk.toString());
    });


    stream.on("close", () => {
        console.log("stream close");
        ffmpeg.stdin.end();
    });

    stream.pipe(ffmpeg.stdin);


    //Wait and click on decline all
    console.log('start to wait selector');
    const declineButtonSelector = '.eom-button-row button';
    await page.waitForSelector(declineButtonSelector, {timeout: 30000});
    await page.click(declineButtonSelector);
    console.log('selector clicked');


    setTimeout(async () => {
        stream.destroy();

        console.log("finished");
    }, 1000 * 30);

    // await browser.close(); // TODO: revert comment. right now it broke stream closing and media saving
}

module.exports = {
    saveStream: saveStream
};