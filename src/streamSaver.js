const { launch, getStream } = require('puppeteer-stream');
const { exec } = require('child_process');
const logger = require('./logger');
const streamScrapping = require('./streamScrapping');

// const browserPath = '/usr/bin/google-chrome';
const browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function saveStream(url, username) {
  const browser = await launch({
    headless: false,
    executablePath: browserPath,
    timeout: 0,
    ignoreDefaultArgs: ['--enable-automation', '--use-fake-ui-for-media-stream'],
    args: ['--start-maximized'],
  });

  const timeoutDuration = 10000;

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
  await page.goto(url || 'https://www.youtube.com/watch?v=pat2c33sbog1', { timeout: timeoutDuration });


  // Instead of waiting must be implemented a native alert automation dismiss (possible ???) or trying to click until clicking is available (loop ?)
  await page.waitForTimeout(6000);

  // Continue meeting on browse
  const continueOnBrowserSelector = 'button[data-tid="joinOnWeb"]';
  logger.debug(`Waiting for "${continueOnBrowserSelector}".`);
  await page.waitForSelector(continueOnBrowserSelector, {timeout: timeoutDuration});
  logger.debug(`Selector "${continueOnBrowserSelector}" is found.`);
  await page.click(continueOnBrowserSelector);

  logger.debug(`Waiting for target URL`);
  const newPageTarget = await browser.waitForTarget(target => target.url() === 'https://teams.microsoft.com/_#/modern-calling/');
  logger.debug(`Target URL found`);
  const newPage = await newPageTarget.page();

  // Handling the iFrames
  const iframe = await newPage.$("iframe")
  const iframeContentFrame = await iframe.contentFrame();

  // Turn off the camera if it is on
  const turnOffCameraSelector = 'div[role="checkbox"][data-tid="toggle-video"]';
  logger.debug(`Waiting for "${turnOffCameraSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(turnOffCameraSelector, { timeout: timeoutDuration });
  logger.debug(`Selector "${turnOffCameraSelector}" found in the iframe content frame.`);

  // Check the camera current state
  const cameraState = await iframeContentFrame.evaluate(selector => {
    const element = document.querySelector(selector);
    return element ? element.getAttribute('data-cid') : null;
  }, turnOffCameraSelector);
  logger.debug(`Camera current state: ${cameraState}`);

  if (cameraState === 'toggle-video-true') {
    await iframeContentFrame.click(turnOffCameraSelector);
  } else {
    logger.debug('Camera is already turned off.');
  }

  // Turn off the microphone
  const turnOffMicrophoneSelector = 'div[role="checkbox"][data-tid="toggle-mute"]';
  logger.debug(`Waiting for "${turnOffMicrophoneSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(turnOffMicrophoneSelector, { timeout: timeoutDuration });
  logger.debug(`Selector "${turnOffMicrophoneSelector}" found in the iframe content frame.`);

  // Check the microphone current state
  const microphoneState = await iframeContentFrame.evaluate(selector => {
    const element = document.querySelector(selector);
    return element ? element.getAttribute('data-cid') : null;
  }, turnOffMicrophoneSelector);
  logger.debug(`Microphone current state: ${microphoneState}`);

  if (microphoneState === 'toggle-mute-true') {
    await iframeContentFrame.click(turnOffMicrophoneSelector);
  } else {
    logger.debug('Microphone is already turned off.');
  }

  // Input name
  const inputFieldSelector = 'input[data-tid="prejoin-display-name-input"]';
  logger.debug(`Waiting for "${inputFieldSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(inputFieldSelector, { timeout: timeoutDuration });
  logger.debug(`Selector "${inputFieldSelector}" found in the iframe content frame.`);
  await iframeContentFrame.type(inputFieldSelector, username);

  // Joining to the meeting as a guest
  const joinButton = '#prejoin-join-button';
  logger.debug(`Waiting for "${joinButton}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(joinButton, { timeout: timeoutDuration });
  logger.debug(`Selector "${joinButton}" found in the iframe content frame.`);
  await iframeContentFrame.click(joinButton);

  const stream = await getStream(page, { audio: true, video: true, frameSize: 1000 });
  const resolution = '1280*720';
  const frameRate = 30;
  const datetime = Date.now().toString();
  const saveDirectoryPath = `C:\\Users\\narti\\studies\\iti0303\\${datetime}.mp4`;

  logger.debug('Recording from %s with %s resolution and %s fps to %s', url, resolution, frameRate, saveDirectoryPath);

  //Start users data scrapping
  streamScrapping.streamScrapping();

  const ffmpeg = exec(`ffmpeg -y -i - -c:v libx264 -c:a aac -s ${resolution} -r ${frameRate} ${saveDirectoryPath}`);
  ffmpeg.stderr.on('data', (chunk) => {
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
