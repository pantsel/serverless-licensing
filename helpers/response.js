module.exports = {
  error: (err) => {
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

  badRequest: (message) => {
    return {
      statusCode: 400,
      headers: {'Content-Type': 'application/json'},
      body: {
        message: message || 'Bad request'
      },
    }
  }
}