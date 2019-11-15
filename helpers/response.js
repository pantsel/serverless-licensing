const Errors = require('./errors');

const _ = require('lodash');

const defaultHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Content-Type': 'application/json;charset=UTF-8'
}

module.exports = {


  negotiate: (err) => {

    let statusCode = err.statusCode || 500;

    if(_.isError(err)) {
      if(err instanceof Errors.ForbiddenError) {
        statusCode = 403;
      }else if (err instanceof Errors.BadRequestError) {
        statusCode = 400;
      }else if (err instanceof Errors.UnauthorizedError) {
        statusCode = 401;
      }else if (err instanceof Errors.ConflictError) {
        statusCode = 409;
      }
      err = {
        message: err.message
      }
    }

    // Handle mongoose duplicate key error E11000
    if(err.message && err.message.indexOf('E11000') > -1) {
      statusCode = 409;
    }

    return {
      statusCode: statusCode,
      headers: defaultHeaders,
      body: JSON.stringify(err),
    }
  },

  ok: (data) => {
    return {statusCode: 200, headers: defaultHeaders, body: data ? JSON.stringify(data) : ""}
  },

  badRequest: (data) => {
    return {
      statusCode: 400,
      headers: defaultHeaders,
      body: _.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Bad request'
      }),
    }
  },

  notFound: (data) => {
    return {
      statusCode: 404,
      headers: defaultHeaders,
      body: _.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Not found'
      }),
    }
  },

  unauthorized: (data) => {
    return {
      statusCode: 401,
      headers: defaultHeaders,
      body:_.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Unauthorized'
      }),
    }
  },

  forbidden: (data) => {
    return {
      statusCode: 403,
      headers: defaultHeaders,
      body: _.isObject(data) ? JSON.stringify(data) : JSON.stringify({
        message: data || 'Forbidden'
      }),
    }
  }
}
