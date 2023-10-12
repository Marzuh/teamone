const express = require('express');
const bodyParser = require('body-parser'); // For parsing form data
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const streamSaver = require('./streamSaver')
const streamScrapper = require('./streamScrapping')

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({extended: false})); // Parse form data

// Static route to display HTML page
app.use(express.static('public'));

// Define the path to the CSV file and create a CSV writer
const csvFilePath = 'data.csv';
const csvWriter = createCsvWriter({
    path: csvFilePath,
    // TODO: The 'header' option does not actually work
    header: [
        {id: 'id', title: 'ID'},
        {id: 'url', title: 'URL'},
        {id: 'startTime', title: 'startTime'},
        {id: 'username', title: 'username'},
        {id: 'password', title: 'password'}
    ],
    append: true // Append records to an existing file
});

// POST route for processing the form and calling the 'saveStream' method
app.post('/save', (req, res) => {
    const {url, startTime, username, password} = req.body;

    // Generate a unique identifier (e.g., timestamp)
    const id = Date.now();

    // Create a data object for writing to the CSV
    const data = {id, url, startTime, username, password};
    console.log(data);

    // Write the data to the CSV file
    csvWriter.writeRecords([data])
        .then(() => {
            console.log('Data successfully saved to the CSV file.');
        })
        .catch((error) => {
            console.error('Error while saving data:', error);
            res.status(500).send('Error while saving data.');
        });

    // Call the 'saveStream' method from streamSaver.js with the URL for recording
    // streamScrapper.scrapeStream(url);
    streamSaver.saveStream(url);
    res.send('Your request has been accepted for processing');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
