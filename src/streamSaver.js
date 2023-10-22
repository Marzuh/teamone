const { launch, getStream } = require('puppeteer-stream');
const { exec } = require('child_process');
const logger = require('./logger');

const browserPath = '/usr/bin/google-chrome';
// const browserPath = 'C:\\program Files\\Google\\Chrome\\Application\\chrome.exe';

const browserAgs = {
  headless: false,
  executablePath: browserPath,
  timeout: 0,
  ignoreDefaultArgs: ['--enable-automation', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  args: ['--start-maximized'],
};

const timeoutDuration = 0;

async function chooseMeetingInBrowser(page) {
  try {
    const continueOnBrowserSelector = 'button[data-tid="joinOnWeb"]';
    logger.debug(`Waiting for "${continueOnBrowserSelector}".`);
    await page.waitForSelector(continueOnBrowserSelector, { timeout: 5000 });
    logger.debug(`Selector "${continueOnBrowserSelector}" is found.`);
    await page.click(continueOnBrowserSelector);
  } catch (error) {
    logger.debug('Error caught for no continueOnBrowserSelector.');
  }
}

async function turnOffCamera(iframeContentFrame) {
  const turnOffCameraSelector = 'div[role="checkbox"][data-tid="toggle-video"]';
  logger.debug(`Waiting for "${turnOffCameraSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(turnOffCameraSelector, { timeout: timeoutDuration });
  logger.debug(`Selector "${turnOffCameraSelector}" found in the iframe content frame.`);

  const cameraState = await iframeContentFrame.evaluate((selector) => {
    const element = document.querySelector(selector);
    return element ? element.getAttribute('data-cid') : null;
  }, turnOffCameraSelector);
  logger.debug(`Camera current state: ${cameraState}`);

  if (cameraState === 'toggle-video-true') {
    await iframeContentFrame.click(turnOffCameraSelector);
  } else {
    logger.debug('Camera is already turned off.');
  }
}

async function turnOffMicrophone(iframeContentFrame) {
  const turnOffMicrophoneSelector = 'div[role="checkbox"][data-tid="toggle-mute"]';
  logger.debug(`Waiting for "${turnOffMicrophoneSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(turnOffMicrophoneSelector, { timeout: timeoutDuration });
  logger.debug(`Selector "${turnOffMicrophoneSelector}" found in the iframe content frame.`);

  const microphoneState = await iframeContentFrame.evaluate((selector) => {
    const element = document.querySelector(selector);
    return element ? element.getAttribute('data-cid') : null;
  }, turnOffMicrophoneSelector);
  logger.debug(`Microphone current state: ${microphoneState}`);

  if (microphoneState === 'toggle-mute-true') {
    await iframeContentFrame.click(turnOffMicrophoneSelector);
  } else {
    logger.debug('Microphone is already turned off.');
  }
}

async function enterUsername(iframeContentFrame, username) {
  const inputFieldSelector = 'input[data-tid="prejoin-display-name-input"]';
  logger.debug(`Waiting for "${inputFieldSelector}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(inputFieldSelector, { timeout: timeoutDuration });
  logger.debug(`Selector "${inputFieldSelector}" found in the iframe content frame.`);
  await iframeContentFrame.type(inputFieldSelector, username);
}

async function joinTheMeeting(iframeContentFrame) {
  const joinButton = '#prejoin-join-button';
  logger.debug(`Waiting for "${joinButton}" in the iframe content frame.`);
  await iframeContentFrame.waitForSelector(joinButton, { timeout: timeoutDuration });
  logger.debug(`Selector "${joinButton}" found in the iframe content frame.`);
  await iframeContentFrame.click(joinButton);
}

async function setupPageViewport(page) {
  const screenResolution = await page.evaluate(() => ({
    width: window.screen.width,
    height: window.screen.height,
  }));

  await page.setViewport({
    width: screenResolution.width,
    height: screenResolution.height,
  });
}

async function saveStream(url, username) {
  const browser = await launch(browserAgs);
  const page = await browser.newPage();

  const pages = await browser.pages();
  await pages[0].close();
  await setupPageViewport(page);

  await page.goto(url, { timeout: timeoutDuration });
  await chooseMeetingInBrowser(page);

  await page.waitForFunction(() => window.location.href === 'https://teams.microsoft.com/_#/modern-calling/', { timeout: timeoutDuration });
  const iframe = await page.$('iframe');
  const iframeContentFrame = await iframe.contentFrame();

  await turnOffCamera(iframeContentFrame);
  await turnOffMicrophone(iframeContentFrame);
  await enterUsername(iframeContentFrame, username);
  await joinTheMeeting(iframeContentFrame);

  const stream = await getStream(page, { audio: true, video: true, frameSize: 1000 });
  const resolution = '1280*720';
  const frameRate = 30;
  const datetime = Date.now().toString();
  const saveDirectoryPath = `/home/aleksei/Study/iti0303/saved_video/${datetime}.mp4`;

  logger.debug('Recording from %s with %s resolution and %s fps to %s', url, resolution, frameRate, saveDirectoryPath);

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
  }, 1000 * 300);

  // TODO: revert comment. right now it broke stream closing and media saving
  // await browser.close();
}

module.exports = {
  saveStream,
};
