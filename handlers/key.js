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
    .catch(err => callback(null, response.error(err)));
};