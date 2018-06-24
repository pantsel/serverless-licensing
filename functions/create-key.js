'use strict';

const uuidv1 = require('uuid/v1');
const uuidv4 = require('uuid/v4');
const dynamodb = require('../dynamodb');
const LicenseKey = require('../lib/license-key');

module.exports.create = (event, context, callback) => {

  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  if(typeof data.serviceId !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'serviceId is required.',
    });
  }

  console.log("process.env.DYNAMODB_TABLE", process.env.DYNAMODB_TABLE);


  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuidv1(),
      value: LicenseKey().generate(data.serviceId),
      serviceId: data.serviceId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  console.log("params",params)

  // write the todo to the database
  dynamodb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the todo item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });

  // const response = {
  //   statusCode: 200,
  //   body: JSON.stringify({
  //     message: 'Go Serverless v1.0! Your function executed successfully!',
  //     input: event,
  //   }),
  // };
  //
  // callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
