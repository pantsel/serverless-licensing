const LicenseKey = require('../lib/license-key');
const connectToDatabase = require('../helpers/db');
const LicenseKeyModel = require('../models/license-key');
const Plan = require('../models/license-key-plan');
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
module.exports.create = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return response.negotiate(e);
  }

  if (!data || !data.serviceId || data.serviceId === 'undefined') {
    console.error('Validation Failed');
    return response.badRequest("Missing required parameters");
  }

  try {
    await connectToDatabase();
    const plan = await Plan.findOne({
      $or:[
        {_id: data.plan},
        {alias: data.plan}
      ]
    });
    if(!plan) return response.badRequest("Invalid plan")

    const key = LicenseKey().generate(data.serviceId);
    const license = await LicenseKeyModel.create(_.merge(data, {plan: plan}, {value: key}));
    return response.ok(license);
  }catch (e) {
    return response.negotiate(e)
  }
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
module.exports.activate = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data.identifier) return response.badRequest("Missing required parameters: `identifier`");
  const value = _.get(event, 'pathParameters.value');

  try {
    await connectToDatabase();
    const license = await LicenseKeyModel.findOne({value: value}).populate('plan');
    if(!license) return response.notFound("License not found");
    if(!license.plan) return response.badRequest("There is no plan assigned to the key");
    if(license.activatedAt || license.identifier) return response.badRequest("Key already activated");

    let now = new Date().getTime();

    license.identifier = data.identifier;
    license.activatedAt = now;

    // Create expiresAt based on the plan
    let planDurationParts = license.plan.duration.split(" "); // ex. `15 years` will be [0] = 15, [1] => `years`
    let expiresAt = moment().add(planDurationParts[0],planDurationParts[1]);
    license.expiresAt = expiresAt;

    if(data.extra && _.isObject(data.extra)) {
      license.extra = data.extra;
    }

    await license.save();
    return response.ok(license);
  }catch (e) {
    return response.negotiate(e);
  }
};


/**
 * Validate a specific key
 * @param event
 * @param context
 * @param callback
 * @returns {Promise<T>}
 */
module.exports.validate = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data.identifier) return response.badRequest("Missing required parameters");
  const value = _.get(event, 'pathParameters.value');

  try {
    await connectToDatabase();
    const license = await LicenseKeyModel.findOne({value: value});
    if(!license) return response.notFound("Key not found");
    if(!license.activatedAt) return response.badRequest("Key not activated");
    if(license.identifier !== data.identifier) return response.badRequest("Identifier mismatch");
    if(license.expiresAt < new Date().getTime()) return response.forbidden("key expired");
    return response.ok(license);
  }catch (e) {
    console.log(e);
    return response.negotiate(e);
  }
};
