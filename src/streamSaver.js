const { launch, getStream } = require("puppeteer-stream");
const { exec } = require("child_process");
const fs = require('fs');

async function saveStream(url, username) {

  // Launch the browser and open a new blank page
  const browser = await launch({
    headless: false,
    executablePath: 'C:\\\\\\\\Program Files\\\\\\\\Google\\\\\\\\Chrome\\\\\\\\Application\\\\\\\\chrome.exe',
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


  // Instead of waiting must be implemented a native alert automation dismiss (possible ???) or trying to click until clicking is available (loop ?)
  await page.waitForTimeout(6000);

  console.log('start to wait selector  CONTINUEONBROWSER');
  const continueOnBrowserSelector = '.btn.secondary ';
  await page.waitForSelector(continueOnBrowserSelector, {timeout: 30000});
  await page.click(continueOnBrowserSelector);
  console.log('selector clicked  CONTINUEONBROWSER');

  const newPageTarget = await browser.waitForTarget(target => target.url() === 'https://teams.live.com/_#/modern-calling/');
  const newPage = await newPageTarget.page();

  // Selectors within the iFrame
  const joinButton = '#prejoin-join-button';
  const inputFieldSelector = '.fluent-ui-component input';
  const turnOffCameraSelector = ".ui-checkbox.e"
  const turnOffMicroSelector = ".ui-checkbox.ho"

  // Handling the iFrames
  const iframe = await newPage.$("iframe")
  const iframeContentFrame = await iframe.contentFrame();

  await iframeContentFrame.waitForSelector(turnOffCameraSelector, { timeout: 9000 });
  await iframeContentFrame.click(turnOffCameraSelector);

  await iframeContentFrame.waitForSelector(turnOffMicroSelector, {timeout: 30000});
  await iframeContentFrame.click(turnOffMicroSelector);


  // Joining to meeting as a guest
  await iframeContentFrame.waitForSelector(inputFieldSelector, { timeout: 9000 });
  await iframeContentFrame.type(inputFieldSelector, username);

  await iframeContentFrame.waitForSelector(joinButton, {timeout: 30000});
  await iframeContentFrame.click(joinButton);

  const stream = await getStream(page, { audio: true, video: true, frameSize: 1000 });
  console.log("recording");

  const ffmpeg = exec(`ffmpeg -y -i - -c:v libx264 -c:a aac "C:\\Users\\volos\\OneDrive\\Документы\\TellimusProjekt\\outputVideo.mp4"`);
  ffmpeg.stderr.on("data", (chunk) => {
    console.log(chunk.toString());
  });


  stream.on("close", () => {
    console.log("stream close");
    ffmpeg.stdin.end();
  });

  stream.pipe(ffmpeg.stdin);

  //await page.waitForTimeout(10000);

  // const html = await newPage.evaluate(() => {
  //   // This code is executed within the page context
  //   // Use document.documentElement.outerHTML to get the entire HTML content
  //   return document.querySelector("#app > div > div > div > div.fluent-ui-component.a.bb.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.ab.ac.ae.af > div > div > div.fui-Flex.___qud7ig0.f22iagw.f1vx9l62.fly5x3f.f1l02sjl.f10pi13n > div.fui-Flex.___1oslqzm.f22iagw.fly5x3f.f1l02sjl.f1jhi6b8.f1p9o1ba.f1sil6mw > div > div > div > div > div").outerHTML;
  // });
  //
  // // Save the HTML content to a file
  // fs.writeFileSync('output.html', html, 'utf-8');
  // console.log('HTML content saved to output.html');

  setTimeout(async () => {
    stream.destroy();

    console.log("finished");
  }, 1000 * 30);

  // await browser.close(); // TODO: revert comment. right now it broke stream closing and media saving
}

module.exports = {
  saveStream: saveStream
};
