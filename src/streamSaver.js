const { launch, getStream } = require('puppeteer-stream');
const { exec } = require('child_process');
const logger = require('./logger');

const browserPath = '/usr/bin/google-chrome';

async function saveStream(url) {
  const browser = await launch({
    headless: false,
    executablePath: browserPath,
    timeout: 0,
    ignoreDefaultArgs: ['--enable-automation', '--use-fake-ui-for-media-stream'],
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

  // Wait and click on decline all
  logger.debug('start to wait selector');
  const declineButtonSelector = '.eom-button-row button';
  await page.waitForSelector(declineButtonSelector, { timeout: 30000 });
  await page.click(declineButtonSelector);
  logger.debug('selector clicked');

  setTimeout(async () => {
    logger.debug('stream destroyed by timer');
    stream.destroy();
  }, 1000 * 30);

  // TODO: revert comment. right now it broke stream closing and media saving
  // await browser.close();
}

module.exports = {
  saveStream,
};
