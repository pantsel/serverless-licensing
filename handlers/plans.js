const connectToDatabase = require('../helpers/db');
const Plan = require('../models/plan');
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
module.exports.create = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let data = {}

  try {
    data = JSON.parse(event.body);
  } catch (e) {}

  // Create alias
  data.alias = slug(data.name).toLowerCase();

  try {
    await connectToDatabase();
    const plan = await Plan.create(data);
    return response.ok(plan);
  }catch (e) {
    return response.negotiate(e);
  }
};

/**
 * Create a plan
 * @param event
 * @param context
 * @param callback
 * @returns {*}
 */
module.exports.delete = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  try{
    await connectToDatabase();
    const planId = _.get(event, 'pathParameters.id');
    const plan = await Plan.findById(planId);
    if(!plan) return response.notFound("Plan not found");
    const res = await plan.remove();
    return response.ok(res);
  }catch (e) {
    return response.negotiate(e);
  }
};

/**
 * Bulk insert plans
 * @param event
 * @param context
 * @returns {*}
 */
module.exports.bulkInsert = async (event, context) => {

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

  try {
    await connectToDatabase();
    const docs = await Plan.insertMany(data);
    return response.ok(docs);
  } catch (e) {
    return response.negotiate(e);
  }
};

/**
 * Query plans
 * @param event
 * @param context
 * @returns {Promise<T>}
 */
module.exports.query = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  let options = {
    page: _.get(event, 'queryStringParameters.page') ? parseInt(event.queryStringParameters.page) : 1,
    limit: _.get(event, 'queryStringParameters.limit') ? parseInt(event.queryStringParameters.limit) : 25,
    sort: _.get(event, 'queryStringParameters.sort') ? event.queryStringParameters.sort : {createdAt: -1}
  }

  try{
    await connectToDatabase();
    const plans = await Plan.paginate({}, options);
    return response.ok(plans);
  }catch (e) {
    return response.negotiate(e);
  }
};

/**
 * Find a specific plan
 * @param event
 * @param context
 * @returns {Promise<T>}
 */
module.exports.findOne = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  const id = _.get(event, 'pathParameters.id');

  try {
    await connectToDatabase();
    const plan = await Plan.findById(id);
    return response.ok(plan);
  }catch (e) {
    return response.negotiate(e);
  }
};
