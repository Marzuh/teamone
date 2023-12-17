const express = require('express');
const bodyParser = require('body-parser'); // For parsing form data
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const { scheduleTasksFilePath } = require('../constants');
const logger = require('../logger');
const { port } = require('../constants');
const { safeSaveScheduledMeeting } = require('../scheduler/scheduler');

const app = express();

app.use(bodyParser.urlencoded({ extended: false })); // Parse form data

app.use(express.static('public'));
app.use(express.json());

const scheduledTaskFilePath = path.resolve(scheduleTasksFilePath);

const csvWriter = createCsvWriter({
  path: scheduledTaskFilePath,
  header: [
    { id: 'id', title: 'id' },
    { id: 'url', title: 'url' },
    { id: 'startTime', title: 'startTime' },
    { id: 'username', title: 'username' },
    { id: 'duration', title: 'duration' },
    { id: 'status', title: 'status' },
  ],
  append: true,
});

app.post('/save', (req, res) => {
  const {
    url, startTime, username, duration,
  } = req.body;

  const status = 'waiting';
  const id = Date.now();
  const data = {
    id, url, startTime, username, duration, status,
  };
  logger.debug('New task with data: %s', data);

  csvWriter.writeRecords([data])
    .then(() => {
      logger.info('Data successfully saved to the CSV file.');
    })
    .catch((error) => {
      logger.error('Error while saving data:', error);
      res.status(500).send('Error while saving data.');
    });

  safeSaveScheduledMeeting(url, startTime, username, duration);
  res.send('Your request has been accepted for processing');
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../public' });
});

function startServer() {
  app.listen(port, () => {
    logger.info(`Server is running on  http://localhost:${port}`);
  });
}

module.exports = {
  startServer,
};
