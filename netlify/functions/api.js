try {
  require('dns').setDefaultResultOrder('ipv4first');
} catch {
  // older Node
}

const serverless = require('serverless-http');
const { createApp } = require('../../server/index');

module.exports.handler = serverless(createApp());
