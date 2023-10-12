const childProcess = require('child_process');

const getExecutablePath = () => {
  if (process.env.CHROME_BIN) {
    return process.env.CHROME_BIN;
  }

  let executablePath;
  if (process.platform === 'linux') {
    try {
      executablePath = childProcess.execSync('which chromium-browser').toString().split('\n').shift();
    } catch (e) {
      // NOOP
    }

    if (!executablePath) {
      try {
        executablePath = childProcess.execSync('which chromium').toString().split('\n').shift();
      } catch (e) {
        // NOOP
      }
    }

    if (!executablePath) {
      executablePath = childProcess.execSync('which chrome').toString().split('\n').shift();
      if (!executablePath) {
        throw new Error('Chrome not found (which chrome)');
      }
    }
  } else if (process.platform === 'darwin') {
    executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else if (process.platform === 'win32') {
    executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }

  return executablePath;
};

module.exports = { getExecutablePath };
