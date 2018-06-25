const express = require('express');
const app = express();
const serverless = require('serverless-http');

app.use('/static', express.static(__dirname+'/static'));

app.get('/reviews', require('./src/service'));

module.exports.handler = serverless(app);
