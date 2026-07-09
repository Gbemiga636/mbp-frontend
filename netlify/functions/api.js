const serverless = require('serverless-http');
const { createApp } = require('../server/index');

module.exports.handler = serverless(createApp());
