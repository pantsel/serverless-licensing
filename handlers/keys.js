const LicenseKey = require('../lib/license-key');
const connectToDatabase = require('../helpers/db');
const LicenseKeyModel = require('../models/license-key');
const LicenseKeyPlanModel = require('../models/license-key-plan');
const response = require('../helpers/response');
const _ = require('lodash');


/**
 * Create a new License key
 * @param event
 * @param context
 * @param callback
 * @returns {*}
 */
module.exports.create = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {
  }

  if (!data.serviceId || data.serviceId === 'undefined' || !data.plan) {
    console.error('Validation Failed');
    return callback(null, response.badRequest("Missing required parameters"));
  }

  return connectToDatabase()
    .then(() => LicenseKeyPlanModel.findOne({alias: data.plan}))
    .then((plan) => {
      if(!plan) return callback(null, response.notFound("plan not found"));
      let key = LicenseKey().generate(data.serviceId);
      return LicenseKeyModel.create(_.merge(data, {value: key}, {plan: plan._id}))
    })
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};

/**
 * Query License keys
 * @param event
 * @param context
 * @param callback
 * @returns {Promise<T>}
 */
module.exports.query = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let options = {
    page: _.get(event, 'queryStringParameters.page') ? parseInt(event.queryStringParameters.page) : 1,
    limit: _.get(event, 'queryStringParameters.limit') ? parseInt(event.queryStringParameters.limit) : 25,
    sort: _.get(event, 'queryStringParameters.sort') ? event.queryStringParameters.sort : {createdAt: -1}
  }

  return connectToDatabase()
    .then(() => LicenseKeyModel.paginate({}, options))
    .then(docs => callback(null, response.ok(docs)))
    .catch(err => callback(null, response.negotiate(err)));
};

/**
 * Find a specific key using its id or value
 * @param event
 * @param context
 * @param callback
 * @returns {Promise<T>}
 */
module.exports.findOne = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  const identifier = _.get(event, 'pathParameters.id');

  return connectToDatabase()
    .then(() => LicenseKeyModel.findById(identifier))
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};