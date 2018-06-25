const LicenseKey = require('../lib/license-key');
const connectToDatabase = require('../helpers/db');
const LicenseKeyModel = require('../models/license-key');
const LicenseKeyPlanModel = require('../models/license-key-plan');
const response = require('../helpers/response');
const _ = require('lodash');
const moment = require('moment');


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
  } catch (e) {}

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


/**
 * Activate a specific key
 * @param event
 * @param context
 * @param callback
 * @returns {Promise<T>}
 */
module.exports.activate = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data.consumerId) return callback(null, response.badRequest("Missing required parameters"))
  const value = _.get(event, 'pathParameters.value');


  return connectToDatabase()
    .then(() => LicenseKeyModel.findOne({value: value}).populate('plan'))
    .then((key) => {

      // Perform some checks
      if(!key) return callback(null, response.notFound("Key not found"));
      if(!key.plan) return callback(null, response.badRequest("There is no plan assigned to the key"));
      if(key.activatedAt || key.consumerId) return callback(null, response.badRequest("Key already activated"));

      let now = new Date().getTime();

      key.consumerId = data.consumerId;
      if(data.identifier) key.identifier = data.identifier;
      key.activatedAt = now;

      // Create expiresAt based on the plan
      let planDurationParts = key.plan.duration.split(" "); // ex. `15 years` will be [0] = 15, [1] => `years`
      let expiresAt = moment(now).add(planDurationParts[0],planDurationParts[1]);
      key.expiresAt = expiresAt;

      return key.save();

    })
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};


/**
 * Validate a specific key
 * @param event
 * @param context
 * @param callback
 * @returns {Promise<T>}
 */
module.exports.validate = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data.consumerId) return callback(null, response.badRequest("Missing required parameters"))
  const value = _.get(event, 'pathParameters.value');


  return connectToDatabase()
    .then(() => LicenseKeyModel.findOne({value: value}))
    .then((key) => {

      if(!key) return callback(null, response.notFound("Key not found"));

      if(!key.activatedAt || !key.consumerId) return callback(null, response.badRequest("Key not activated"));

      if(key.consumerId !== data.consumerId) {
        return callback(null, response.forbidden("Invalid consumer"));
      }

      if(key.identifier !== data.identifier) {
        return callback(null, response.forbidden("Invalid identifier"));
      }

      if(key.expiresAt < new Date().getTime()) {
        return callback(null, response.forbidden("key expired"));
      }

      return key;

    })
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};