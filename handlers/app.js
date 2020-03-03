const response = require('../helpers/response');

module.exports.info = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;

  const pk = require('../package');
  const info = {
    version: pk.version,
    date: new Date()
  }

  return response.ok(info);
};
