const { launch, getStream } = require('puppeteer-stream');
const { exec } = require('child_process');
const { executablePath } = require('puppeteer');
const logger = require('./logger');

async function saveStream(url, username) {
  const browser = await launch({
    headless: false,
    executablePath: executablePath(),
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
  await page.goto(url || 'https://www.youtube.com/watch?v=pat2c33sbog1', { timeout: 0 });


  // Instead of waiting must be implemented a native alert automation dismiss (possible ???) or trying to click until clicking is available (loop ?)
  await page.waitForTimeout(6000);

  const continueOnBrowserSelector = 'button.btn.primary';
  logger.debug(`Waiting for "${continueOnBrowserSelector}".`);
  await page.waitForSelector(continueOnBrowserSelector, {timeout: 30000});
  logger.debug(`Selector "${continueOnBrowserSelector}" is found.`);
  await page.click(continueOnBrowserSelector);

  logger.debug(`Waiting for target URL`);
  const newPageTarget = await browser.waitForTarget(target => target.url() === 'https://teams.microsoft.com/_#/modern-calling/');
  logger.debug(`Target URL found`);
  const newPage = await newPageTarget.page();

  // Selectors within the iFrame
  const joinButton = '#prejoin-join-button';
  const inputFieldSelector = '.fluent-ui-component input';
  const turnOffCameraSelector = "#app .fui-Flex.___1mal4v8 .ui-checkbox";
  const turnOffMicroSelector = "#app .fui-Flex.___1gzszts .ui-checkbox";

  // Handling the iFrames
  const iframe = await newPage.$("iframe")
  const iframeContentFrame = await iframe.contentFrame();

  logger.debug(`Waiting for "${turnOffCameraSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(turnOffCameraSelector, { timeout: 30000 });
  logger.debug(`Selector "${turnOffCameraSelector}" found in the iframe content frame.`);
  await iframeContentFrame.click(turnOffCameraSelector);

  logger.debug(`Waiting for "${turnOffMicroSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(turnOffMicroSelector, { timeout: 30000 });
  logger.debug(`Selector "${turnOffMicroSelector}" found in the iframe content frame.`);
  await iframeContentFrame.click(turnOffMicroSelector);

// Joining the meeting as a guest
  logger.debug(`Waiting for "${inputFieldSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(inputFieldSelector, { timeout: 30000 });
  logger.debug(`Selector "${inputFieldSelector}" found in the iframe content frame.`);
  await iframeContentFrame.type(inputFieldSelector, username);

  logger.debug(`Waiting for "${joinButton}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(joinButton, { timeout: 30000 });
  logger.debug(`Selector "${joinButton}" found in the iframe content frame.`);
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
