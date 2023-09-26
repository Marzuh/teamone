const express = require('express');
const bodyParser = require('body-parser'); // Для обработки данных из формы
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const streamSaver = require('./streamSaver')

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false })); // Парсинг данных из формы

// Статический маршрут для отображения HTML-страницы
app.use(express.static('public'));

// Определите путь к CSV-файлу и создайте CSV-писатель
const csvFilePath = 'data.csv';
const csvWriter = createCsvWriter({
    path: csvFilePath,
    //TODO: header does not actually work
    header: [
        { id: 'id', title: 'ID' },
        { id: 'url', title: 'URL' },
        { id: 'startTime', title: 'startTime' },
        { id: 'username', title: 'username' },
        { id: 'password', title: 'password' }
    ],
    append: true // Добавить запись к существующему файлу
});

// POST-маршрут для обработки формы и вызова метода saveStream
app.post('/save', async (req, res) => {
    const {url, startTime, username, password} = req.body;

    // Генерируйте уникальный идентификатор (например, временную метку)
    const id = Date.now();

    // Создайте объект данных для записи в CSV
    const data = {id, url, startTime, username, password};
    console.log(data);


    // Запишите данные в CSV-файл
    await csvWriter.writeRecords([data])
        .then(() => {
            console.log('Данные успешно сохранены в CSV-файл.');
            res.send('Данные успешно сохранены в CSV-файл.');
        })
        .catch((error) => {
            console.error('Ошибка при сохранении данных:', error);
            res.status(500).send('Ошибка при сохранении данных.');
        });

    // Здесь вызывайте метод saveStream из streamSaver.js с передачей URL и выполнением записи
    // streamSaver.saveStream(url);
    res.send('Ваш запрос принят в обработку');
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});