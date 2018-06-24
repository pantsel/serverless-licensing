const LicenseKey = require('../lib/license-key');
const connectToDatabase = require('../helpers/db');
const LicenseKeyModel = require('../models/license-key');
const response = require('../helpers/response');
const _ = require('lodash');

module.exports.create = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try{
    data = JSON.parse(event.body);
  }catch (e) {}

  if (!data.serviceId || data.serviceId === 'undefined') {
    console.error('Validation Failed');
    return callback(null, response.badRequest("Missing required parameters"));
  }

  let key = LicenseKey().generate(data.serviceId);

  return connectToDatabase()
    .then(() => LicenseKeyModel.create(_.merge(data, { value: key })))
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};

module.exports.list = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let options = {
    page : _.get(event, 'queryStringParameters.page') ? parseInt(event.queryStringParameters.page) : 1,
    limit: _.get(event, 'queryStringParameters.limit') ? parseInt(event.queryStringParameters.limit) : 25,
    sort : _.get(event, 'queryStringParameters.sort') ? event.queryStringParameters.sort : { createdAt: -1 }
  }

  return connectToDatabase()
    .then(() => LicenseKeyModel.paginate({},options))
    .then(docs => callback(null, response.ok(docs)))
    .catch(err => callback(null, response.negotiate(err)));
};