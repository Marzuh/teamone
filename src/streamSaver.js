const { launch, getStream } = require('puppeteer-stream');
const { exec } = require('child_process');
const logger = require('./logger');
const fs = require('fs');

async function saveStream(url, username) {

  // Launch the browser and open a new blank page
  const browser = await launch({
    headless: false,
    executablePath: 'C:\\\\\\\\Program Files\\\\\\\\Google\\\\\\\\Chrome\\\\\\\\Application\\\\\\\\chrome.exe',
    timeout: 0,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  const pages = await browser.pages();
  if (pages.length > 1) {
    await pages[0].close();
  }

  const screenResolution = await page.evaluate(() => ({
    width: window.screen.width,
    height: window.screen.height,
  }));

  // Set viewport resolution
  await page.setViewport({
    width: screenResolution.width,
    height: screenResolution.height,
  });

  // Navigate the page to a URL
  await page.goto(url || 'https://www.youtube.com/watch?v=pat2c33sbog1', {timeout: 0});


  // Instead of waiting must be implemented a native alert automation dismiss (possible ???) or trying to click until clicking is available (loop ?)
  await page.waitForTimeout(6000);

  logger.debug('start to wait selector  CONTINUEONBROWSER')
  const continueOnBrowserSelector = 'button.btn.primary';
  await page.waitForSelector(continueOnBrowserSelector, {timeout: 30000});
  await page.click(continueOnBrowserSelector);
  logger.debug('selector clicked  CONTINUEONBROWSER')

  const newPageTarget = await browser.waitForTarget(target => target.url() === 'https://teams.microsoft.com/_#/modern-calling/');
  const newPage = await newPageTarget.page();

  // Selectors within the iFrame
  const joinButton = '#prejoin-join-button';
  const inputFieldSelector = '.fluent-ui-component input';
  const turnOffCameraSelector = "div.ui-checkbox.e.eh.ei"
  const turnOffMicroSelector = ".ui-checkbox.ho"

  // Handling the iFrames
  const iframe = await newPage.$("iframe")
  const iframeContentFrame = await iframe.contentFrame();

  await iframeContentFrame.waitForSelector(turnOffCameraSelector, { timeout: 30000 });
  await iframeContentFrame.click(turnOffCameraSelector);

  await iframeContentFrame.waitForSelector(turnOffMicroSelector, {timeout: 30000});
  await iframeContentFrame.click(turnOffMicroSelector);


  // Joining to meeting as a guest
  await iframeContentFrame.waitForSelector(inputFieldSelector, { timeout: 30000 });
  await iframeContentFrame.type(inputFieldSelector, username);

  await iframeContentFrame.waitForSelector(joinButton, {timeout: 30000});
  await iframeContentFrame.click(joinButton);

  const stream = await getStream(page, { audio: true, video: true, frameSize: 1000 });
  logger.debug('recording from %s', url);

  const ffmpeg = exec(`ffmpeg -y -i - -c:v libx264 -c:a aac "C:\\Users\\volos\\OneDrive\\Документы\\TellimusProjekt\\outputVideo.mp4"`);
  ffmpeg.stderr.on("data", (chunk) => {
    logger.debug('stream data event occurs. Chunk: %s', chunk.toString());
  });

  stream.on('close', () => {
    logger.debug('stream close event occurs');
    ffmpeg.stdin.end();
  });

  stream.pipe(ffmpeg.stdin);

  setTimeout(async () => {
    logger.debug('stream destroyed by timer');
    stream.destroy();
  }, 1000 * 30);

  // TODO: revert comment. right now it broke stream closing and media saving
  // await browser.close();
}

module.exports = {
  saveStream: saveStream
};
