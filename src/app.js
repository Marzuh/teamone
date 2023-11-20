const { startServer } = require('./server/server');
const { initScheduler } = require('./scheduler/scheduler');

startServer();
initScheduler();
