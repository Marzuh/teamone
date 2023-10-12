const {launch, getStream} = require("puppeteer-stream");
const {exec} = require("child_process");

async function saveStream(url, username) {

    // Launch the browser and open a new blank page
    const browser = await launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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

    const stream = await getStream(page, {audio: true, video: true, frameSize: 1000});
    console.log("recording");

    const ffmpeg = exec(`ffmpeg -y -i - -c:v libx264 -c:a aac "C:\\Users\\narti\\studies\\iti0303\\output4.mp4"`);
    ffmpeg.stderr.on("data", (chunk) => {
        console.log(chunk.toString());
    });


    stream.on("close", () => {
        console.log("stream close");
        ffmpeg.stdin.end();
    });

    stream.pipe(ffmpeg.stdin);

    // Instead of waiting must be implemented a native alert automation dismiss (possible ???) or trying to click until clicking is available (loop ?)
    await page.waitForTimeout(6000);

    console.log('start to wait selector  CONTINUEONBROWSER');
    const continueOnBrowserSelector = '#container > div > div > div.mainActionsContent > div.actionsContainer > div > button.btn.primary';
    await page.waitForSelector(continueOnBrowserSelector, {timeout: 30000});
    await page.click(continueOnBrowserSelector);
    console.log('selector clicked  CONTINUEONBROWSER');

    const newPageTarget = await browser.waitForTarget(target => target.url() === 'https://teams.live.com/_#/modern-calling/');
    const newPage = await newPageTarget.page();

    // Selectors within the iFrame
    const joinButton = '#prejoin-join-button';
    const inputFieldSelector = '#app > div > div > div > div.fluent-ui-component.a.bb.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.ab.ac.ae.af > div > div > div > div > div.fui-Flex.___1mh95rt.f22iagw.f4d9j23.f122n59.f106ow9f.fyw3hzw.fcyhscq > div > div.fui-Flex.___1gzszts.f22iagw > span > input';
    const turnOffCameraSelector = "#app > div > div > div > div.fluent-ui-component.a.bb.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.ab.ac.ae.af > div > div > div > div > div.fui-Flex.___zb4aq60.f22iagw.f1vx9l62.f2q8o33 > div.fui-Flex.___1ee5yt8.f22iagw.f6jr5hl.f1869bpl.fwo5xp5.fdtf0n.f96nzly > div > div.fui-Flex.___1mal4v8.f22iagw.f4d9j23.f122n59.fly5x3f.f1l02sjl.fxugw4r.f1jhi6b8.fi64zpg.f17gev4g.f118ihkj.fzkkow9.f68mrw8.f1aa9q02.f16jpd5f.f40v2ht.fw294f7 > div > div:nth-child(2) > div:nth-child(2) > div.ui-checkbox.e.bt.bu.bv.bw.bx.ho.by.bz.ca.cb.cc.cd.ce.cf.cg.ch.ci.cj.cl.cm.cn.co.cp.cq.cr.cs.ct.cu.cv.cw.cx.cy.cz.da.db.dc.dd.de.df.dg.dh.di.dj.dk.dl.dm.dn.do.dp.dq.dr.ds.dt.du.dv.dw.dx.dy.dz.ea.eb.ec.ed.ee.ef.eg.eh.ei.hp.hq.hr.hs.en.eo.ep.eq.er.es.fh.ht.fj.hu.hv.hw.fm.fn > div"
    const turnOffMicroSelector = "#app > div > div > div > div.fluent-ui-component.a.bb.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.ab.ac.ae.af > div > div > div > div > div.fui-Flex.___zb4aq60.f22iagw.f1vx9l62.f2q8o33 > div.fui-Flex.___1ee5yt8.f22iagw.f6jr5hl.f1869bpl.fwo5xp5.fdtf0n.f96nzly > div > div.fui-Flex.___1mal4v8.f22iagw.f4d9j23.f122n59.fly5x3f.f1l02sjl.fxugw4r.f1jhi6b8.fi64zpg.f17gev4g.f118ihkj.fzkkow9.f68mrw8.f1aa9q02.f16jpd5f.f40v2ht.fw294f7 > div > div:nth-child(2) > div:nth-child(1) > div.ui-checkbox.e.bt.bu.bv.bw.bx.ho.by.bz.ca.cb.cc.cd.ce.cf.cg.ch.ci.cj.cl.cm.cn.co.cp.cq.cr.cs.ct.cu.cv.cw.cx.cy.cz.da.db.dc.dd.de.df.dg.dh.di.dj.dk.dl.dm.dn.do.dp.dq.dr.ds.dt.du.dv.dw.dx.dy.dz.ea.eb.ec.ed.ee.ef.eg.eh.ei.hp.hq.hr.hs.en.eo.ep.eq.er.es.fh.ht.fj.hu.hv.hw.fm.fn > div"

    // Handling the iFrames
    const iframe = await newPage.$("iframe")
    const iframeContentFrame = await iframe.contentFrame();

    await iframeContentFrame.waitForSelector(turnOffCameraSelector, {timeout: 9000});
    await iframeContentFrame.click(turnOffCameraSelector);

    await iframeContentFrame.waitForSelector(turnOffMicroSelector, {timeout: 40000});
    await iframeContentFrame.click(turnOffMicroSelector);


    // Joining to meeting as a guest
    await iframeContentFrame.waitForSelector(inputFieldSelector, {timeout: 9000});
    await iframeContentFrame.type(inputFieldSelector, username);

    await iframeContentFrame.waitForSelector(joinButton, {timeout: 40000});
    await iframeContentFrame.click(joinButton);

    setTimeout(async () => {
        stream.destroy();

        console.log("finished");
    }, 1000 * 60);

    // await browser.close(); // TODO: revert comment. right now it broke stream closing and media saving
}

module.exports = {
    saveStream: saveStream
};