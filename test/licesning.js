'use strict';

process.env.NODE_ENV = 'test';

const sleep = require('util').promisify(setTimeout);
const mochaPlugin = require('serverless-mocha-plugin');
const expect = mochaPlugin.chai.expect;
const actions = {
  plan : {
    create: mochaPlugin.getWrapper('createPlan', '/handlers/plans.js', 'create'),
    delete: mochaPlugin.getWrapper('deletePlan', '/handlers/plans.js', 'delete')
  },
  license: {
    create: mochaPlugin.getWrapper('createKey', '/handlers/licenses.js', 'create'),
    update: mochaPlugin.getWrapper('updateKey', '/handlers/licenses.js', 'update'),
    activate: mochaPlugin.getWrapper('activateKey', '/handlers/licenses.js', 'activate'),
    validate: mochaPlugin.getWrapper('validateKey', '/handlers/licenses.js', 'validate'),
    expire: mochaPlugin.getWrapper('expireKey', '/handlers/licenses.js', 'expire'),
    delete: mochaPlugin.getWrapper('deleteLicense', '/handlers/licenses.js', 'delete')
  }
}

function dropDB(done) {
  console.log('Dropping database');
  const mongoose = require('mongoose');
  mongoose.connect(process.env.mongo_url_test,function(){
    mongoose.connection.db.dropDatabase();
    console.log('Database dropped');
    done();
  });
}

function validateErrorResponse(response, id, statusCode) {
  const body = JSON.parse(response.body);
  expect(response).to.not.be.empty;
  expect(response.statusCode).to.be.eql(statusCode || 400);
  expect(body).to.have.property('id').that.is.eql(id);
  expect(body).to.not.be.empty;
}

describe('Licensing actions', () => {

  let planId;
  const serviceId = 'testService';
  const deviceId = 'testDevice';
  let license;
  const requiredParamsForValidation = ['identifier', 'serviceId']

  after((done) => {
    dropDB(done);
  });

  it('Should create a plan', () => {
    return actions.plan.create.run({
      body: {
        "name": "debug",
        "description": "Debug license",
        "duration": "3 seconds"
      }
    }).then((response) => {
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);
      expect(response.body).to.not.be.empty;
      const body = JSON.parse(response.body);
      expect(body).to.have.property('_id');
      planId = body._id;
    });
  });

  it('Should create a license for that plan', () => {
    return actions.license.create.run({
      body: {
        "serviceId": serviceId,
        "plan": planId
      }
    }).then((response) => {
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);
      expect(response.body).to.not.be.empty;
      const body = JSON.parse(response.body);
      expect(body).to.have.property('_id');
      expect(body).to.have.property('key');
      license = body;
    });
  });

  it('Should respond with 400 `SERVICE_ID_MISMATCH` on activate,' +
    ' when provided serviceId doesn\'t match the one on the license', () => {
    return actions.license.activate.run({
      body: {
        "serviceId": 'someserviceid',
        "identifier": deviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      validateErrorResponse(response, 'SERVICE_ID_MISMATCH')
    });
  });

  it('Should respond with 400 `LICENSE_NOT_ACTIVE` when trying to validate a not yet activated license', () => {
    return actions.license.validate.run({
      body: {
        "identifier": deviceId,
        "serviceId": serviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      validateErrorResponse(response, 'LICENSE_NOT_ACTIVE')
    });
  });

  it('Should activate license if everything is OK', () => {
    return actions.license.activate.run({
      body: {
        "serviceId": serviceId,
        "identifier": deviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);
      expect(response.body).to.not.be.empty;
      const body = JSON.parse(response.body);
      expect(body).to.have.property('_id');
      expect(body).to.have.property('activatedAt').that.is.a('number');
      expect(body).to.have.property('expiresAt').that.is.a('number');
      license = body;
    });
  });

  it('Should respond with 400 `LICENSE_ALREADY_ACTIVE` when trying to double activate a license', () => {
    return actions.license.activate.run({
      body: {
        "serviceId": serviceId,
        "identifier": deviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      validateErrorResponse(response, 'LICENSE_ALREADY_ACTIVE')
    });
  });

  it('Should validate active license', () => {
    return actions.license.validate.run({
      body: {
        "identifier": deviceId,
        "serviceId": serviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      const body = JSON.parse(response.body);

      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);

      expect(body).to.not.be.empty;
      expect(body).to.have.property('_id');
      expect(body).to.have.property('status').that.is.eql('active');
      expect(body).to.have.property('identifier').that.is.eql(deviceId);
      expect(body).to.have.property('serviceId').that.is.eql(serviceId);
      expect(body).to.have.property('key').that.is.eql(license.key);
      expect(body).to.have.property('plan').that.has.property('_id').that.is.eql(planId);
      expect(body).to.have.property('activatedAt').that.is.a('number');
      expect(body).to.have.property('expiresAt').that.is.a('number');
      expect(body.expiresAt).to.be.above(new Date().getTime());
      license = body;
    });
  });

  it('Should respond with 400 `IDENTIFIER_MISMATCH` on validation if wrong identifier is used', () => {
    return actions.license.validate.run({
      body: {
        "identifier": "wrongidentifier",
        "serviceId": serviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      validateErrorResponse(response, 'IDENTIFIER_MISMATCH')
    });
  });

  it('Should respond with 400 `SERVICE_ID_MISMATCH` on validation if wrong serviceId is used', () => {
    return actions.license.validate.run({
      body: {
        "identifier": deviceId,
        "serviceId": "wrongserviceid"
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      validateErrorResponse(response, 'SERVICE_ID_MISMATCH')
    });
  });

  it('Should respond with 404 `LICENSE_NOT_FOUND` on validation if license key is invalid', () => {
    return actions.license.validate.run({
      body: {
        "identifier": deviceId,
        "serviceId": serviceId
      },
      pathParameters: {
        value: 'invalidlicensekey'
      }
    }).then((response) => {
      validateErrorResponse(response, 'LICENSE_NOT_FOUND', 404);
    });
  });

  requiredParamsForValidation.forEach(param => {
    it('Should respond with 400 `MISSING_PARAMETERS` on validation if ' + param + ' is not provided', () => {
      const bodyObj = {};
      bodyObj['param'] = param === 'identifier' ? deviceId : serviceId;
      return actions.license.validate.run({
        body: bodyObj,
        pathParameters: {
          value: license.key
        }
      }).then((response) => {
        validateErrorResponse(response, 'MISSING_PARAMETERS');
      });
    });
  })

  it('Should respond with 400 `LICENSE_EXPIRED` on validation if license has expired', async () => {

    await sleep(3000); // Sleep for the plans duration (3s)

    const response = await actions.license.validate.run({
      body: {
        "identifier": deviceId,
        "serviceId": serviceId
      },
      pathParameters: {
        value: license.key
      }
    })

    validateErrorResponse(response, 'LICENSE_EXPIRED');

  });

  const identifyingProperties = ['_id', 'key'];
  identifyingProperties.forEach(identifyingProperty => {
    it('Should update existing license provided the `' + identifyingProperty + '`', async () => {

      const updates = {
        identifier: 'identifier',
        comments: 'This is just a comment',
        extra: {
          season: false,
          blocked: true
        },
        customerId: 'customerId'
      }

      const response = await actions.license.update.run({
        body: updates,
        pathParameters: {
          id: license[identifyingProperty]
        }
      });

      const body = JSON.parse(response.body);
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);
      expect(body).to.not.be.empty;
      expect(body).to.have.property('identifier').that.is.eql(updates.identifier);
      expect(body).to.have.property('comments').that.is.eql(updates.comments);
      expect(body).to.have.property('extra').that.is.eql(updates.extra);
      expect(body).to.have.property('customerId').that.is.eql(updates.customerId);

    });
  });

  describe('Expire license', () => {

    before(async () => {
      const response = await actions.license.create.run({
        body: {
          "serviceId": serviceId,
          "plan": planId
        }
      });

      const body = JSON.parse(response.body);
      license = body;

    });

    it('Should respond with 400 `LICENSE_NOT_ACTIVE` when trying to expire a not yet activated license', async () => {
      const response = await actions.license.expire.run({
        pathParameters: {
          id: license._id
        }
      })

      validateErrorResponse(response, 'LICENSE_NOT_ACTIVE')

      // Activate license for the upcoming test cases
      await actions.license.activate.run({
        body: {
          "identifier": deviceId,
          "serviceId": serviceId
        },
        pathParameters: {
          value: license.key
        }
      });
    });

    it('Should expire an active license', async () => {

      const response = await actions.license.expire.run({
        pathParameters: {
          id: license._id
        }
      })

      const body = JSON.parse(response.body);
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);
      expect(body).to.not.be.empty;
      expect(body).to.have.property('_id');
      expect(body).to.have.property('status').that.is.eql('expired');

    });

    it('Should respond with 400 `LICENSE_EXPIRED` when trying to expire an already expired license', async () => {
      const response = await actions.license.expire.run({
        pathParameters: {
          id: license._id
        }
      });
      validateErrorResponse(response, 'LICENSE_EXPIRED');
    });

  })
});
