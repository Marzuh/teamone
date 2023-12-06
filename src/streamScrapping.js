const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const logger = require('./logger');
const {debug, log} = require("winston");
const directoryPath = 'C:\\Users\\volos\\OneDrive\\Документы\\TellimusProjekt'; // Update the directory path



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

const allSpeakingUsers = [];
async function scrapeStream(iframeContentFrame, datetime) {
  // eslint-disable-next-line no-template-curly-in-string
  const directoryPath = 'C:\\Users\\volos\\OneDrive\\Документы\\TellimusProjekt'; // Update the directory path
  const csvFileName = `meeting-data-${datetime}.csv`; // Combine datetime with the filename
  const csvFilePath = path.join(directoryPath, csvFileName); // Combine directory and filename
  const csvDynamicFileName = `dynamic-data-${datetime}.csv`; // Combine datetime with the filename
  const csvDynamicFilePath = path.join(directoryPath, csvDynamicFileName); // Combine directory and filename
  const csvParticipantsWriter = createCsvWriter({
    path: csvFilePath,
    append: false, // Append records to an existing file
    header: [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'participants', title: 'Participants' },
    ],
  });

  const csvDynamicWriter = createCsvWriter({
    path: csvDynamicFilePath,
    append: false, // Append records to an existing file
    header: [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'participants', title: 'Participants' },
    ],
  });

  // Ensure the CSV file has headers
  await csvParticipantsWriter.writeRecords([]);

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
    const dynamicDataList = [];
    logger.debug('start scrapping participants names');
    for (const participantElement of participants) {
      try {
        const nameElement = await participantElement.$('span');
        const name = await nameElement.evaluate((element) => element.textContent.trim());
        const speakingStringElement = await participantElement.$('div.ui-list__itemmedia.ka > div');
        let speakingString = await speakingStringElement.evaluate((element) => element.getAttribute('class'));
        const muteElement = await participantElement.$('div.fui-Flex.hide-on-list-item-hover svg[data-cid]');
        const mute = await muteElement.evaluate((element) => element.getAttribute('data-cid'));

        if (speakingString.toString() === stringOfNotSpeakingUser) {
          speakingString = 'not speaking';
        } else {
          speakingString = 'speaking';
          dynamicDataList.push(name);
        }

        participantNames.push({ name, speakingString, mute });
      } catch (error) {
        // Handle the error (e.g., log it or ignore it)
        console.error('Error processing participant:', error.message);
      }
    }

    logger.debug('finish scrapping participants names', participantNames);

    if (dynamicDataList.length > 0) {
      allSpeakingUsers.push(dynamicDataList);
    }

    const participantsData = [
      {
        timestamp: currentTimestamp,
        participants: participantNames.map((item) => `${item.name}, ${item.speakingString}, ${item.mute}`).join(', '),
      },
    ];
    await csvParticipantsWriter.writeRecords(participantsData);

    if (dynamicDataList.length > 0) {
      const participantsString = dynamicDataList.join(', ');
      const dynamicData = [
        {
          timestamp: currentTimestamp,
          participants: `${participantsString} ${dynamicDataList.length > 1 ? 'are speaking' : 'is speaking'}`,
        },
      ];

      logger.debug('write data to file');
      await csvDynamicWriter.writeRecords(dynamicData);
    }
  };

  // Set a timeout to run the initial data collection
  setTimeout(() => {
    pollParticipants();
    // Poll for participants every 10 sec
    setInterval(pollParticipants, 2000);
  }, 2000);
}

function handleStop() {
  console.log(allSpeakingUsers);
  let newUserCountMap = {};
  let isLastIteration = false;
  const lines = [];
  const fs = require('fs');
  const path = require('path');


  // const csvFileName2 = 'test-data.csv'; // Combine datetime with the filename
  // const csvFilePath2 = path.join(directoryPath, csvFileName2); // Combine directory and filename
  //
  //
  // const csvMapWriter = createCsvWriter({
  //   path: csvFilePath2,
  //   append: false, // Append records to an existing file
  //   header: [
  //     { id: 'line', title: 'Line' },
  //   ],
  // });

  for (const [index, userList] of allSpeakingUsers.entries()) {
    for (const userName of userList) {
      if (newUserCountMap[userName]) {
        newUserCountMap[userName]+=2;
      } else {
        newUserCountMap[userName] = 2;
      }
    }

    isLastIteration = index === allSpeakingUsers.length - 1;

    // Сохраняем удаленных пользователей в файл и удаляем их из мапа
    for (const [userName, count] of Object.entries(newUserCountMap)) {
      if (!userList.includes(userName) || isLastIteration) {
        if (count > 2) {
          const line = `${userName} - ${count - 2} sek ->`;
          lines.push(line);
          // Use csv-writer to write records to the CSV file
        }
        delete newUserCountMap[userName];
      }
    }
  }
  const csvData = lines.join('\n');
  console.log(csvData);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const filePath = path.join(directoryPath, 'output_data.csv');

  fs.writeFileSync(filePath, lines.join('\n'));
  process.exit(); // This exits the Node.js process
}

// Register the handleStop function for the SIGINT signal
process.on('SIGINT', handleStop);


module.exports = {
  streamScrapping: scrapeStream,
};
