const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const logger = require('../logger');
let directoryPath;
const fs = require('fs');
// List to hold all the lists of participants who spoke every 2 seconds
const listOfDynamicLists = [];

const SELECTOR_WAITING_TIMEOUT = 65000;


// Finding string of muted user, detecting the unique string of not speaking user
async function findStringOfNotSpeakingUser(listOfParticipants) {
  let mutedState = null;
  for (const participantElement of listOfParticipants) {
    const classAttribute = await participantElement.$eval('.ui-list__itemmedia', element => element.outerHTML);
    const matches = classAttribute.match(/class="(.*?)"/g);
    const state = matches && matches.length >= 2 ? matches[1].replace('class="', '').replace('"', '') : null;
    const muteElement = await participantElement.$('div.fui-Flex.hide-on-list-item-hover svg[data-cid]');
    const mute = await muteElement.evaluate((element) => element.getAttribute('data-cid'));
    if (mute === 'roster-participant-muted') {
      mutedState = state;
      break;
    }
  }
  return mutedState;
}

async function startScrapping(page, datetime, newFolderPath) {
  directoryPath = newFolderPath;
  const meetingDataFile = `meeting-data.csv`;
  const meetingDataPath = path.join(directoryPath, meetingDataFile);
  const meetingDataWriter = createCsvWriter({
    path: meetingDataPath,
    append: false, // Append records to an existing file
    header: [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'participants', title: 'Participants' },
    ],
  });

  const dynamicFileName = `dynamic-data.csv`;
  const dynamicFilePath = path.join(directoryPath, dynamicFileName);
  const dynamicFileWriter = createCsvWriter({
    path: dynamicFilePath,
    append: false, // Append records to an existing file
    header: [
      { id: 'timestamp', title: 'Timestamp (UTC)' },
      { id: 'participants', title: 'Participants' },
    ],
  });

  // Ensure the CSV file has headers
  await meetingDataWriter.writeRecords([]);

  const participantsButton = '#roster-button';
  await page.waitForSelector(participantsButton, { timeout: SELECTOR_WAITING_TIMEOUT });
  await page.click(participantsButton);
  logger.debug('Show participants button is clicked ...');

  const participantsListElement = await page.waitForSelector('.virtual-tree-list-scroll-container', { timeout: SELECTOR_WAITING_TIMEOUT });
  const listOfParticipants = await participantsListElement.$$('[data-cid="roster-participant"]');
  const stringOfNotSpeakingUser = await findStringOfNotSpeakingUser(listOfParticipants);
  const pollParticipants = async () => {
    const currentTimestamp = new Date().toISOString();
    const participantsDataList = [];
    const speakingParticipantsList = [];
    logger.debug('Start scrapping participants data ...');
    for (const participantElement of listOfParticipants) {
      try {
        const name = await participantElement.$eval('.fui-StyledText', span => span.getAttribute('title'));
        const classAttribute = await participantElement.$eval('.ui-list__itemmedia', element => element.outerHTML);
        const matches = classAttribute.match(/class="(.*?)"/g);
        let speakingString = matches && matches.length >= 2 ? matches[1].replace('class="', '').replace('"', '') : null;
        const muteElement = await participantElement.$('div.fui-Flex.hide-on-list-item-hover svg[data-cid]');
        const muteState = await muteElement.evaluate((element) => element.getAttribute('data-cid'));
        if (speakingString.toString() === stringOfNotSpeakingUser) {
          speakingString = 'not speaking';
        } else {
          speakingString = 'speaking';
          speakingParticipantsList.push(name);
        }
        participantsDataList.push({ name, speakingString, muteState });
      } catch (error) {
        // Handle the error (e.g., log it or ignore it)
        logger.debug('Error processing participant:', error.message);
      }
    }

    logger.debug('Finish scrapping participants names ...', participantsDataList);

    if (speakingParticipantsList.length > 0) {
      listOfDynamicLists.push(speakingParticipantsList);
    }

    const participantsData = [
      {
        timestamp: currentTimestamp,
        participants: participantsDataList.map((item) => `${item.name}, ${item.speakingString}, ${item.muteState}`).join(', '),
      },
    ];
    logger.debug('Writing meeting data into file ...');
    await meetingDataWriter.writeRecords(participantsData);

    if (speakingParticipantsList.length > 0) {
      const participantsString = speakingParticipantsList.join(', ');
      const dynamicData = [
        {
          timestamp: currentTimestamp,
          participants: `${participantsString} ${speakingParticipantsList.length > 1 ? 'are speaking' : 'is speaking'}`,
        },
      ];

      logger.debug('Writing dynamic data into file ...');
      await dynamicFileWriter.writeRecords(dynamicData);
    }
  };

  // Set a timeout to run the initial data collection
  setTimeout(() => {
    pollParticipants();
    // Poll for participants every 2 sec
    setInterval(pollParticipants, 2000);
  }, 2000);
}

function handleStop() {
  logger.debug(listOfDynamicLists);
  const newUserCountMap = {};
  const participantsSpeakingTimes = [];

  for (const [index, participantList] of listOfDynamicLists.entries()) {
    // Count participants' speaking time
    for (const participantName of participantList) {
      newUserCountMap[participantName] = (newUserCountMap[participantName] || 0) + 2;
    }

    // Check if it's the last iteration
    const isLastIteration = index === listOfDynamicLists.length - 1;

    // Process speaking time and generate participantsSpeakingTimes
    for (const [participantName, count] of Object.entries(newUserCountMap)) {
      // Check if participant stopped speaking
      const participantStoppedSpeaking = !participantList.includes(participantName);

      if (participantStoppedSpeaking || isLastIteration) {
        if (count > 2) {
          const participantTime = `${participantName} - ${count} sek ->`;
          participantsSpeakingTimes.push(participantTime);
        }
        delete newUserCountMap[participantName];
      }
    }
  }
  const eachSpeakingParticipantTime = participantsSpeakingTimes.join('\n');
  logger.debug(eachSpeakingParticipantTime);
  const speakingParticipantsPath = path.join(directoryPath, `output_data.csv`);
  fs.writeFileSync(speakingParticipantsPath, eachSpeakingParticipantTime);

  // Exit the Node.js process
  process.exit();
}
// Register the handleStop function for the SIGINT signal
process.on('SIGINT', handleStop);
module.exports = {
  streamScrapping: scrapeStream,
  handleStop,
};
