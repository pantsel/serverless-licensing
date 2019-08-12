module.exports = {
  LICENSE_NOT_FOUND: {
    message: 'License not found',
    id: 'LICENSE_NOT_FOUND',
    statusCode: 404
  },

  NO_PLAN_TO_LICENSE: {
    message: 'There is no plan associated with the license',
    id: 'NO_PLAN_TO_KEY',
    statusCode: 400
  },

  LICENSE_ALREADY_ACTIVE: {
    message: 'The given license has already been activated',
    id: 'LICENSE_ALREADY_ACTIVE',
    statusCode: 400
  },

  LICENSE_NOT_ACTIVE: {
    message: 'The given license has not yet been activated',
    id: 'LICENSE_NOT_ACTIVE',
    statusCode: 400
  },

  IDENTIFIER_MISMATCH: {
    message: 'Identifier mismatch',
    id: 'IDENTIFIER_MISMATCH',
    statusCode: 400
  },

  LICENSE_EXPIRED: {
    message: 'The License has expired',
    id: 'LICENSE_EXPIRED',
    statusCode: 400
  },

  MISSING_PARAMETERS: {
    message: 'Missing required parameters',
    id: 'MISSING_PARAMETERS',
    statusCode: 400
  }
}
