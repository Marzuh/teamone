const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const logger = require('./logger');

let intervalId;
const mapObjectKeys = (originalObject) => {
  const mappedObject = {};
  for (const key in originalObject) {
    // Replace spaces with underscores and convert to lowercase
    const newKey = key.replace(/ /g, '_').toLowerCase();
    mappedObject[newKey] = originalObject[key];
  }
  return mappedObject;
};
async function scrapeStream(iframeContentFrame, datetime) {
  // eslint-disable-next-line no-template-curly-in-string
  const directoryPath = 'C:/Users/narti/studies/iti0303/'; // Update the directory path
  const csvFileName = `meeting-data-${datetime}.csv`; // Combine datetime with the filename
  const csvFilePath = path.join(directoryPath, csvFileName); // Combine directory and filename
  const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
      { id: 'meeting_uid', title: 'Meeting UID' },
      { id: 'participant_name', title: 'Participant Name' },
      { id: 'joined_timestamp', title: 'Joined Timestamp' },
      { id: 'left_timestamp', title: 'Left Timestamp' },
    ],
  });

  // Ensure the CSV file has headers
  await csvWriter.writeRecords([]);

  const participantsButton = '#roster-button';
  await iframeContentFrame.waitForSelector(participantsButton);
  await iframeContentFrame.click(participantsButton);
  logger.debug('click');

  const participantsListElement = await iframeContentFrame.waitForSelector('[data-tid="app-layout-area--end"]');

  let participantsData = [];
  let participantsNames = [];
  const readParticipantsFile = async () => {
    logger.info('start reading');
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const isEmptyRow = Object.values(row).every((value) => !value.trim());
        if (!isEmptyRow) {
          const mappedRow = mapObjectKeys(row);
          participantsData.push(mappedRow);
          participantsNames.push(mappedRow.participant_name);
          logger.error(JSON.stringify(mappedRow));
        }
      })
      .on('end', () => {
        // logger.error('CSV file reading completed.');
        logger.info(JSON.stringify(participantsData));
        logger.info(JSON.stringify(participantsNames));
      });
  };

  let participantsUpdate = false;
  const pollParticipants = async () => {
    logger.debug(`default data ${participantsData}`);
    logger.debug(`default names ${participantsNames}`);
    await readParticipantsFile();
    const currentTimestamp = new Date().toISOString();
    const participants = await participantsListElement.$$('[data-cid="roster-participant"]');
    const currentPartisipantsNames = [];

    logger.debug('start scrapping participants names');
    // eslint-disable-next-line no-restricted-syntax
    for (const participantElement of participants) {
      // eslint-disable-next-line no-await-in-loop
      const nameElement = await participantElement.$('span');
      // eslint-disable-next-line no-await-in-loop
      const name = await nameElement.evaluate((element) => element.textContent.trim());
      currentPartisipantsNames.push(name);

      const existingParticipant = participantsData.find(
        (participant) => participant.participant_name === name,
      );

      if (!existingParticipant || existingParticipant.left_timestamp !== '') {
        participantsUpdate = true;
        participantsData.push({
          meeting_uid: 2, // Replace with the actual meeting UID when available
          participant_name: name,
          joined_timestamp: currentTimestamp,
          left_timestamp: '', // Initial value is empty
        });
        participantsNames.push(name);
      }
    }

    // Check if there are participants in participantsNames not present in currentPartisipantsNames
    const missingParticipants = participantsNames.filter(
      (name) => !currentPartisipantsNames.includes(name),
    );

    logger.debug(`missing partisipants: ${JSON.stringify(missingParticipants)}`);
    // Update left_timestamp for missing participants
    missingParticipants.forEach((missingName) => {
      const missingParticipant = participantsData.find(
        (participant) => participant.participant_name === missingName,
      );
      if (missingParticipant && missingParticipant.left_timestamp === '') {
        participantsUpdate = true;
        missingParticipant.left_timestamp = currentTimestamp;
      }
    });

    logger.debug(`participants update ${participantsUpdate}`);

    // Convert the participantsData object values to an array
    const data = Object.values(participantsData);

    logger.debug(`write data to file ${JSON.stringify(data)}`);
    // Rewrite file
    if (participantsUpdate) {
      await csvWriter.writeRecords(data);
    }
    participantsData = [];
    participantsNames = [];
  };

  // Set a timeout to run the initial data collection
  setTimeout(() => {
    pollParticipants();
    // Poll for participants every 10 sec
    intervalId = setInterval(pollParticipants, 10000);
  }, 10000);
}
module.exports = {
  streamScrapping: scrapeStream,
  intervalId, // Export the interval ID
};
