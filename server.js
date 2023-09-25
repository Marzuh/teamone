const express = require('express');
const bodyParser = require('body-parser'); // Для обработки данных из формы
const streamSaver = require('./streamSaver')

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false })); // Парсинг данных из формы

// Статический маршрут для отображения HTML-страницы
app.use(express.static('public'));

// POST-маршрут для обработки формы и вызова метода saveStream
app.post('/save', (req, res) => {
    const url = req.body.url; // Получение URL из формы
    const startTime = req.body?.startTime; // Получение времени начала
    const username = req.body?.username; // Получение имени пользователя
    const password = req.body?.password; // Получение пароля
    console.log(req.body);
    // Здесь вызывайте метод saveStream из streamSaver.js с передачей URL и выполнением записи
    streamSaver.saveStream(url);
    res.send('Ваш запрос принят в обработку');
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});