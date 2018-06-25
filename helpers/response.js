const _ = require('lodash');

module.exports = {
  negotiate: (err) => {
    return {
      statusCode: err.statusCode || 501,
      headers: {'Content-Type': 'application/json'},
      body: {
        message: err.message || 'Server error'
      },
    }
  },

  ok: (data) => {
    return {statusCode: 200, body: data ? JSON.stringify(data) : ""}
  },

  badRequest: (data) => {
    return {
      statusCode: 400,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? data : {
        message: data || 'Bad request'
      },
    }
  },

  notFound: (data) => {
    return {
      statusCode: 404,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? data : {
        message: data || 'Not found'
      },
    }
  },

  unauthorized: (data) => {
    return {
      statusCode: 401,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? data : {
        message: data || 'Unauthorized'
      },
    }
  },

  forbidden: (data) => {
    return {
      statusCode: 403,
      headers: {'Content-Type': 'application/json'},
      body: _.isObject(data) ? data : {
        message: data || 'Forbidden'
      },
    }
  }
}