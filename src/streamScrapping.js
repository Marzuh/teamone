const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const logger = require('./logger');

async function scrapeStream(iframeContentFrame, datetime) {
  // eslint-disable-next-line no-template-curly-in-string
  const directoryPath = 'C:/Users/narti/studies/iti0303/'; // Update the directory path
  const csvFileName = `meeting-data-${datetime}.csv`; // Combine datetime with the filename
  const csvFilePath = path.join(directoryPath, csvFileName); // Combine directory and filename
  const csvWriter = createCsvWriter({
    path: csvFilePath,
    append: false, // Append records to an existing file
    header: [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'participants', title: 'Participants' },
    ],
  });

  // Ensure the CSV file has headers
  await csvWriter.writeRecords([]);

  const participantsButton = '#roster-button';
  await iframeContentFrame.waitForSelector(participantsButton);
  await iframeContentFrame.click(participantsButton);
  logger.debug('click');

  const participantsListElement = await iframeContentFrame.waitForSelector('[data-tid="app-layout-area--end"]');

  const pollParticipants = async () => {
    const currentTimestamp = new Date().toISOString();
    const participants = await participantsListElement.$$('[data-cid="roster-participant"]');
    const participantNames = [];

    logger.debug('start scrapping participants names');
    // eslint-disable-next-line no-restricted-syntax
    for (const participantElement of participants) {
      // eslint-disable-next-line no-await-in-loop
      const nameElement = await participantElement.$('span');
      // eslint-disable-next-line no-await-in-loop
      const name = await nameElement.evaluate((element) => element.textContent.trim());
      participantNames.push(name);
    }

    logger.debug('finish scrapping participants names', participantNames);

    const data = [
      {
        timestamp: currentTimestamp,
        participants: participantNames.join(', '),
      },
    ];

    logger.debug('write data to file');
    // Write data as an array of records
    await csvWriter.writeRecords(data);
  };

  // Set a timeout to run the initial data collection
  setTimeout(() => {
    pollParticipants();
    // Poll for participants every 10 sec
    setInterval(pollParticipants, 10000);
  }, 10000);
}

module.exports = {
  streamScrapping: scrapeStream,
};
