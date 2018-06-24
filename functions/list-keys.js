'use strict';

const dynamodb = require('../dynamodb');
const _ = require('lodash');

module.exports.list = (event, context, callback) => {


  const limit = event.queryStringParameters ? event.queryStringParameters.limit : 50;
  const next = event.queryStringParameters ? {
    id: event.queryStringParameters.next
  } : {};


  // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!", event)

  let searchableKeys = ['serviceId', 'value', 'id'];
  let FilterExpression;
  let ExpressionAttributeNames;
  let ExpressionAttributeValues;

  if (event.queryStringParameters) {
    for (let key in event.queryStringParameters) {
      if (searchableKeys.indexOf(key) > -1) {

        if (!ExpressionAttributeNames) ExpressionAttributeNames = {};
        if (!ExpressionAttributeValues) ExpressionAttributeValues = {};

        FilterExpression = FilterExpression ? " and #" + key + ' = :' + key : '#' + key + ' = :' + key;
        ExpressionAttributeNames['#' + key] = key;
        ExpressionAttributeValues[':' + key] = _.get(event, 'queryStringParameters.' + key);

      }
    }
  }

  console.log("FILTERS", {
    FilterExpression: FilterExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues,
  })

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Limit: limit
  };

  const queryParams = _.merge(params, next, FilterExpression ? {
    FilterExpression: FilterExpression,
    ExpressionAttributeNames: ExpressionAttributeNames,
    ExpressionAttributeValues: ExpressionAttributeValues,
  } : {});

  // console.log("countParams",countParams)
  console.log("queryParams", queryParams)


  dynamodb.scan(queryParams, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: {'Content-Type': 'text/plain'},
        body: 'Couldn\'t fetch the todo item.',
      });
      return;
    }

    const response = {
      statusCode: 200,
      body: result,
    };

    callback(null, response);
  });


}
;