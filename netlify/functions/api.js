const serverless = require('serverless-http');
const app = require('../../server'); // a- We are importing your existing server

module.exports.handler = serverless(app);