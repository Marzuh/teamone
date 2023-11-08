const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const logger = require('./logger');
const {debug, log} = require("winston");


// Finding string of muted user, detecting the unique string of not speaking user
async function findStringOfNotSpeakingUser(participantsListElement) {
  let mutedState = null;
  const randomParticipants = await participantsListElement.$$('[data-cid="roster-participant"]');
  for (const participantElement of randomParticipants) {
    const stateElement = await participantElement.$('div.ui-list__itemmedia.ka > div');
    const state = await stateElement.evaluate((element) => element.getAttribute('class'));
    const muteElement = await participantElement.$('div.fui-Flex.hide-on-list-item-hover svg[data-cid]');
    const mute = await muteElement.evaluate((element) => element.getAttribute('data-cid'));
    if (mute === 'roster-participant-muted') {
      mutedState = state;
      break;
    }
  }
  return mutedState;
}
async function scrapeStream(iframeContentFrame, datetime) {
  // eslint-disable-next-line no-template-curly-in-string
  const directoryPath = 'C:\\Users\\volos\\OneDrive\\Документы\\TellimusProjekt'; // Update the directory path
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
  const stringOfNotSpeakingUser = await findStringOfNotSpeakingUser(participantsListElement);
  const pollParticipants = async () => {
    const currentTimestamp = new Date().toISOString();
    const participants = await participantsListElement.$$('[data-cid="roster-participant"]');
    const participantNames = [];
    logger.debug('start scrapping participants names');
    for (const participantElement of participants) {
      const nameElement = await participantElement.$('span');
      const name = await nameElement.evaluate((element) => element.textContent.trim());
      const speakingStringElement = await participantElement.$('div.ui-list__itemmedia.ka > div');
      let speakingString = await speakingStringElement.evaluate((element) => element.getAttribute('class'));
      const muteElement = await participantElement.$('div.fui-Flex.hide-on-list-item-hover svg[data-cid]');
      const mute = await muteElement.evaluate((element) => element.getAttribute('data-cid'));
      if (speakingString.toString() === stringOfNotSpeakingUser) {
        speakingString = 'not speakingString';
      } else {
        speakingString = 'speaking';
      }
      participantNames.push({ name, speakingString, mute });
    }

    logger.debug('finish scrapping participants names', participantNames);

    const data = [
      {
        timestamp: currentTimestamp,
        participants: participantNames.map((item) => `${item.name}, ${item.speakingString}, ${item.mute}`).join(', '),
      },
    ];

    logger.debug('write data to file');
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
