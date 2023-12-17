const fs = require('fs');
const path = require('path');

const csvParser = require('csv-parser');
const schedule = require('node-schedule');
const { scheduleTasksFilePath } = require('../constants');
const logger = require('../logger');
const streamSaver = require('../stream/streamSaver');

function saveScheduledMeeting(url, startTime, username, duration) {
  logger.info(`Added new task for user ${username} at ${startTime}`);
  const maxDuration = duration * 60 * 1000 || 1000 * 60 * 60 * 1.5;
  schedule.scheduleJob(startTime, () => {
    logger.info(`Starting scheduled meeting for ${username}`);
    streamSaver.saveStream(url, username, maxDuration);
  });
}

function isDateNotInPast(startTimeString) {
  const startTime = new Date(startTimeString);
  const currentTime = new Date();

  return startTime >= currentTime;
}

function safeSaveScheduledMeeting(url, startTime, username, duration) {
  if (isDateNotInPast(startTime)) {
    saveScheduledMeeting(url, startTime, username, duration);
  } else {
    logger.info(`Task for user ${username} scheduled at ${startTime} can not be saved, because it in past`);
  }
}

function readAndScheduleMeetings(csvFilePath) {
  let rowCounter = 0;
  fs.createReadStream(csvFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      rowCounter += 1;
      if (row.status === 'waiting') {
        safeSaveScheduledMeeting(row.url, new Date(row.startTime), row.username, row.duration);
      }
    })
    .on('end', () => {
      logger.info(`CSV file processing completed. ${rowCounter} tasks was added to queue.`);
    })
    .on('error', (error) => logger.error('Error reading data.csv:', error));
}

async function checkAndProcessCsv() {
  const csvFilePath = path.join(__dirname, scheduleTasksFilePath);
  try {
    await fs.promises.access(csvFilePath);
    logger.info(`${scheduleTasksFilePath} exists, reading file.`);
    readAndScheduleMeetings(csvFilePath);
  } catch (err) {
    logger.info(`${scheduleTasksFilePath} does not exist. Create new file with headers. No task were added.`);
    const data = 'id,url,startTime,username,duration,status\n';
    await fs.promises.writeFile(csvFilePath, data, 'utf8');
  }
}

function initScheduler() {
  checkAndProcessCsv();
}

module.exports = { initScheduler, safeSaveScheduledMeeting };
