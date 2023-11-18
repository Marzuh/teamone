const express = require('express');
const bodyParser = require('body-parser'); // For parsing form data
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const schedule = require('node-schedule');
const logger = require('./logger');
const streamSaver = require('./streamSaver');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false })); // Parse form data

// Static route to display HTML page
app.use(express.static('public'));

// Define the path to the CSV file and create a CSV writer
const csvFilePath = 'data.csv';
const csvWriter = createCsvWriter({
  path: csvFilePath,
  // TODO: The 'header' option does not actually work
  header: [
    { id: 'id', title: 'ID' },
    { id: 'url', title: 'URL' },
    { id: 'startTime', title: 'startTime' },
    { id: 'username', title: 'username' },
    { id: 'password', title: 'password' },
  ],
  append: true, // Append records to an existing file
});

// POST route for processing the form and calling the 'saveStream' method
app.post('/save', (req, res) => {
  const {
    url, startTime, username, password,
  } = req.body;

  // Generate a unique identifier (e.g., timestamp)
  const id = Date.now();

  // Create a data object for writing to the CSV
  const data = {
    id, url, startTime, username, password,
  };
  logger.debug('New task with data: %s', data);

  // Write the data to the CSV file
  csvWriter.writeRecords([data])
    .then(() => {
      logger.info('Data successfully saved to the CSV file.');
    })
    .catch((error) => {
      logger.error('Error while saving data:', error);
      res.status(500).send('Error while saving data.');
    });

  // Call the 'saveStream' method from streamSaver.js with the URL for recording
  streamSaver.saveStream(url, username);
  res.send('Your request has been accepted for processing');
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

function saveScheduledMeeting() {
  const meetingScheduledDate = new Date(2023, 9, 24, 18, 0);
  // const meetingScheduledDate = new Date(2023, 9, 24, 11, 34);
  const meetingMaxDuration = 1000 * 60 * 60 * 1.5; // 1.5h
  // const meetingMaxDuration = 1000 * 10; // 1.5h
  const meetingUrl = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_NDNjMjNiMzMtZDMyNC00NzlmLTk2YmYtZmMyZmE2M2U1Mjli%40thread.v2/0?context=%7b%22Tid%22%3a%226c425ff2-6865-42df-a4db-8e6af634813d%22%2c%22Oid%22%3a%22658d47be-797d-4560-ac33-ab600597ebf8%22%7d';
  const username = 'Aleksei Sohh';
  // eslint-disable-next-line max-len
  schedule.scheduleJob(meetingScheduledDate, () => {
    logger.debug(`Job added at ${meetingScheduledDate}`);
    streamSaver.saveStream(meetingUrl, username, meetingMaxDuration).then(
      logger.debug('Teams meeting finished correctly.'),
    );
  });
}

saveScheduledMeeting();
