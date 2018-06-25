const connectToDatabase = require('../helpers/db');
const LicenseKeyPlanModel = require('../models/license-key-plan');
const response = require('../helpers/response');
const _ = require('lodash');
const slug = require('slug');


/**
 * Create a plan
 * @param event
 * @param context
 * @param callback
 * @returns {*}
 */
module.exports.bulkInsert = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  // Create alias
  data.alias = slug(data.name).toLowerCase();

  return connectToDatabase()
    .then(() => LicenseKeyPlanModel.create(data))
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};

/**
 * Bulk insert plans
 * @param event
 * @param context
 * @param callback
 * @returns {*}
 */
module.exports.bulkInsert = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = []

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data instanceof Array || !data.length) {
    return callback(null, response.badRequest("Invalid body"));
  }

  // Create aliases and timestamps
  const now = new Date().getTime();
  data.forEach(item => {
    item.alias = slug(item.name).toLowerCase();
    item.createdAt = now;
    item.updatedAt = now;
  })

  return connectToDatabase()
    .then(() => LicenseKeyPlanModel.insertMany(data))
    .then(docs => callback(null, response.ok(docs)))
    .catch(err => callback(null, response.negotiate(err)));
};

/**
 * Query plans
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
    .then(() => LicenseKeyPlanModel.paginate({}, options))
    .then(docs => callback(null, response.ok(docs)))
    .catch(err => callback(null, response.negotiate(err)));
};

/**
 * Find a specific plan
 * @param event
 * @param context
 * @param callback
 * @returns {Promise<T>}
 */
module.exports.findOne = (event, context, callback) => {

  context.callbackWaitsForEmptyEventLoop = false;

  const identifier = _.get(event, 'pathParameters.id');

  return connectToDatabase()
    .then(() => LicenseKeyPlanModel.findById(identifier))
    .then(doc => callback(null, response.ok(doc)))
    .catch(err => callback(null, response.negotiate(err)));
};