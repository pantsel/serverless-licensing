const _ = require('lodash');

module.exports = {
  negotiate: (err) => {

    let statusCode = err.statusCode || 500;

    // Handle mongoose duplicate key error E11000
    if(err.message && err.message.indexOf('E11000') > -1) {
      statusCode = 409;
    }

    if(err.message && err.message.indexOf('validation failed') > -1) {
      statusCode = 400;
    }


    if(err.message && err.message.indexOf('[400]') > -1) {
      statusCode = 400;
      message = err.message.replace('[400]', '');
    }

    return {
      statusCode: statusCode,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(err),
    }
  },

  ok: (data) => {
    return {statusCode: 200, body: data ? JSON.stringify(data) : ""}
  },

  badRequest: (data) => {
    return {
      statusCode: 400,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Bad request'
      }),
    }
  },

  notFound: (data) => {
    return {
      statusCode: 404,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Not found'
      }),
    }
  },

  unauthorized: (data) => {
    return {
      statusCode: 401,
      headers: {'Content-Type': 'application/json'},
      body:_.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Unauthorized'
      }),
    }
  },

  forbidden: (data) => {
    return {
      statusCode: 403,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Forbidden'
      }),
    }
  }
}
