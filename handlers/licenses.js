const LicenseKey = require('../lib/license-key');
const mongoose = require('mongoose');
const connectToDatabase = require('../helpers/db');
const License = require('../models/license');
const Plan = require('../models/plan');
const response = require('../helpers/response');
const _ = require('lodash');
const moment = require('moment');
const LicensingResponses = require('../helpers/licensing-reponses');


/**
 * Create a new License
 * @param event
 * @param context
 * @returns {Promise<T>}
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

    let key;
    do {
      key = LicenseKey().generate(data.serviceId);
    }while (await License.count({key: key}) > 0);

    const license = await License.create(_.merge(data, {plan: plan}, {key: key}));
    return response.ok(license);
  }catch (e) {
    return response.negotiate(e)
  }
};

/**
 * Query Licenses
 * @param event
 * @param context
 * @returns {Promise<T>}
 */
module.exports.query = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let options = {
    page: _.get(event, 'queryStringParameters.page') ? parseInt(event.queryStringParameters.page) : 1,
    limit: _.get(event, 'queryStringParameters.limit') ? parseInt(event.queryStringParameters.limit) : 25,
    sort: _.get(event, 'queryStringParameters.sort') ? event.queryStringParameters.sort : {createdAt: -1}
  }

  const criteria = {
    serviceId: _.get(event, 'queryStringParameters.serviceId'),
    plan: _.get(event, 'queryStringParameters.plan'),
    identifier: _.get(event, 'queryStringParameters.identifier')
  }

  const status = _.get(event, 'queryStringParameters.status');
  const now = new Date().getTime();
  switch (status) {
    case "pending_activation":
      criteria.activatedAt = {
        $exists: false
      }
      break;
    case "active":
      criteria.activatedAt = {
        $lte: now
      }
      criteria.expiresAt = {
        $gte: now
      }
      break;
    case "expired":
      criteria.expiresAt = {
        $lt: now
      }
      break;
  }

  console.log("criteria => ", _.pickBy(criteria, _.identity))

  try {
    await connectToDatabase();
    const results = await License.paginate(_.pickBy(criteria, _.identity), options);
    return response.ok(results);
  }catch (e) {
    return response.negotiate(e);
  }
};

/**
 * Find a specific License using its _id or key
 * @param event
 * @param context
 * @returns {Promise<T>}
 */
module.exports.findOne = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  try{
    await connectToDatabase();
    const identifier = _.get(event, 'pathParameters.id');
    let criteria = {};
    if(mongoose.Types.ObjectId.isValid(identifier)) {
      criteria._id = identifier
    }else{
      criteria.key = identifier;
    }
    const license =  await License.findOne(criteria);
    if(!license) return response.negotiate(LicensingResponses.LICENSE_NOT_FOUND);
    return response.ok(license);
  }catch (e) {
    return response.negotiate(e);
  }
};


/**
 * Activate a specific License
 * @param event
 * @param context
 * @returns {Promise<T>}
 */
module.exports.activate = async(event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data.identifier || !data.serviceId) return response.negotiate(LicensingResponses.MISSING_PARAMETERS);
  const key = _.get(event, 'pathParameters.value');

  try {
    await connectToDatabase();
    const license = await License.findOne({key: key}).populate('plan');
    if(!license) return response.negotiate(LicensingResponses.LICENSE_NOT_FOUND);
    if(!license.plan) return response.negotiate(LicensingResponses.NO_PLAN_TO_LICENSE);
    if(license.serviceId !== data.serviceId) return response.negotiate(LicensingResponses.SERVICE_ID_MISMATCH);
    if(license.activatedAt || license.identifier) return response.negotiate(LicensingResponses.LICENSE_ALREADY_ACTIVE);

    // Check if there's an existing active license for the given identifier and serviceId.
    // If that's the case, we will need to extend the newly activated license's expiry based
    // on the existing license's remaining time
    const existingActiveKeyForIdentifier = await License.findOne({
      identifier: data.identifier,
      serviceId: license.serviceId,
      expiresAt: {
        $gte: new Date().getTime()
      }
    })

    let now = new Date().getTime();
    let licenseStartTime = existingActiveKeyForIdentifier ? existingActiveKeyForIdentifier.expiresAt : now;

    license.identifier = data.identifier;
    license.activatedAt = now;

    // Create expiresAt based on the plan
    let planDurationParts = license.plan.duration.split(" "); // ex. `15 years` will be [0] = 15, [1] => `years`
    let expiresAt = moment(licenseStartTime).add(planDurationParts[0],planDurationParts[1]);
    license.expiresAt = expiresAt;

    // Finally, add extra info if provided
    if(data.extra && _.isObject(data.extra)) {
      license.extra = data.extra;
    }

    // Expire the existing license if needed
    if(existingActiveKeyForIdentifier) {
      existingActiveKeyForIdentifier.expiresAt = now;
      await existingActiveKeyForIdentifier.save();
    }

    // Save new License
    await license.save();

    return response.ok(license);
  }catch (e) {
    return response.negotiate(e);
  }
};


/**
 * Validate a specific License
 * @param event
 * @param context
 * @returns {Promise<T>}
 */
module.exports.validate = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  if(!data.identifier) return response.negotiate(LicensingResponses.MISSING_PARAMETERS);
  const key = _.get(event, 'pathParameters.value');

  try {
    await connectToDatabase();
    const license = await License.findOne({key: key});
    if(!license) return response.negotiate(LicensingResponses.LICENSE_NOT_FOUND);
    if(!license.activatedAt) return response.negotiate(LicensingResponses.LICENSE_NOT_ACTIVE);
    if(license.identifier !== data.identifier) return response.negotiate(LicensingResponses.IDENTIFIER_MISMATCH);
    if(license.expiresAt < new Date().getTime()) return response.negotiate(LicensingResponses.LICENSE_EXPIRED);
    return response.ok(license);
  }catch (e) {
    console.log(e);
    return response.negotiate(e);
  }
};
