const fs = require("fs");
const csvParser = require("csv-parser");
const logger = require('../logger');
const path = require('path');


function processDataStart(id, inputFileDir){
    logger.info('start processing data')
    const outputDirectory = path.join(inputFileDir, 'processed_data');

    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const csvFiles = fs.readdirSync(inputFileDir).filter(file => file.endsWith('.csv'));

    logger.debug(csvFiles);

    for (const file of csvFiles) {
        const inputFilePath = path.join(inputFileDir, file);

        if (file === 'meeting-data.csv') {
            processParticipantsData(inputFilePath, outputDirectory, id);
        } if (file === 'output_data.csv') {
            processWhoIsDominant(inputFilePath, outputDirectory, id);
        }if (file === 'dynamic-data.csv') {
            processWhoStartedSpeaking(inputFilePath, outputDirectory, id);
        }
    }

    logger.info( 'finish processing data');
}

function processWhoStartedSpeaking(inputPath, outPutPath, meetingUUID){
    const outputFilePath = path.join(outPutPath,'who_started_speaking.csv')
    const inputStream = fs.createReadStream(inputPath);

    let currentSpeaker = '';
    let currentTimestamp = '';

    const processedLines = ["meeting_uid,timestamp,speaker_name"];

    inputStream
        .pipe(csvParser({ separator: ',' }))
        .on('data', (data) => {
            const timestamp = data.Timestamp;
            const participants = data.Participants;

            const speakerMatch = participants.match(/^(.*?) is speaking$/);
            const speaker = speakerMatch ? speakerMatch[1] : '';

            // Check if the speaker has changed
            if (speaker !== currentSpeaker) {

                processedLines.push(`${meetingUUID},${timestamp},${speaker}`);

                // Update current speaker and timestamp
                currentSpeaker = speaker;
                currentTimestamp = timestamp;
            }
        })
        .on('end', () => {
            // Write the processed lines to the speakers.csv file
            fs.writeFileSync(outputFilePath, processedLines.join('\n'));
        });
}

function processWhoIsDominant(inputPath, outPutPath, meetingUUID){
    console.log(inputPath)
    console.log(outPutPath)
    const outputFilePath = path.join(outPutPath,'who_is_dominant.csv')
    const inputStream = fs.createReadStream(inputPath);

    const speakingTimeMap = new Map();

    const processedLines = ["meeting_uid,participant_name,speaking_seconds"];

    inputStream
        .pipe(csvParser({ separator: ',' }))
        .on('data', (data) => {
            const participantName = data.UserName.trim();
            const speakingTime = parseInt(data.SpeakingTime.trim(), 10);

            if (!speakingTimeMap.has(participantName)) {
                speakingTimeMap.set(participantName, 0);
            }
            speakingTimeMap.set(participantName, speakingTimeMap.get(participantName) + speakingTime);
        })
        .on('end', () => {
            speakingTimeMap.forEach((speakingSeconds, participantName) => {
                processedLines.push(`${meetingUUID},${participantName},${speakingSeconds}`);
            });

            fs.writeFileSync(outputFilePath, processedLines.join('\n'));
        });
}
function processParticipantsData(inputPath, outPutPath, meetingUUID){
    const outputFilePath = path.join(outPutPath,'participants.csv')
    const inputStream = fs.createReadStream(inputPath);

    const processedLines = ["meeting_uid, participant_name, joined_timestamp, left_timestamp"];

    const participantsMap = new Map();

    inputStream
        .pipe(csvParser())
        .on('data', (data) => {
            if (data.Timestamp !== undefined) {
                const timestamp = data.Timestamp;
                const participantList = data.Participants.split(';');

                participantsMap.forEach((participantInfo, participant) => {
                    if (!participantList.includes(participant)) {
                        const leftTimestamp = timestamp;
                        participantInfo.leftTimestamp = leftTimestamp;
                        processedLines.push([meetingUUID, participant, participantInfo.joinedTimestamp, leftTimestamp].join(','));
                        participantsMap.delete(participant);
                    }
                });

                participantList.forEach(participant => {
                    if (!participantsMap.has(participant)) {
                        participantsMap.set(participant, { joinedTimestamp: timestamp });
                    }
                });
            }
        })
        .on('end', () => {

            participantsMap.forEach((participantInfo, participant) => {
                if (!participantInfo.leftTimestamp) {
                    participantInfo.leftTimestamp = 'n/a';
                }

                processedLines.push([meetingUUID, participant, participantInfo.joinedTimestamp, participantInfo.leftTimestamp].join(','));
            });

            fs.writeFileSync(outputFilePath, processedLines.join('\n'));
        });
}

module.exports = {
    processDataStart,
}
