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
    activate: mochaPlugin.getWrapper('activateKey', '/handlers/licenses.js', 'activate'),
    validate: mochaPlugin.getWrapper('validateKey', '/handlers/licenses.js', 'validate'),
    delete: mochaPlugin.getWrapper('deleteLicense', '/handlers/licenses.js', 'delete')
  }
}

describe('Licensing actions', () => {

  let planId;
  let serviceId = 'testService';
  let deviceId = 'testDevice';
  let license;

  function dropDB(done) {
    console.log('Dropping database');
    const mongoose = require('mongoose');
    mongoose.connect(process.env.mongo_url_test,function(){
      mongoose.connection.db.dropDatabase();
      console.log('Database dropped');
      done();
    });
  }

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

  it('Should respond with 400 `LICENSE_NOT_ACTIVE` when trying to validate a not yet activated license', () => {
    return actions.license.validate.run({
      body: {
        "identifier": deviceId
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      const body = JSON.parse(response.body);
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(400);
      expect(body).to.have.property('id').that.is.eql('LICENSE_NOT_ACTIVE');
      expect(body).to.not.be.empty;
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
      const body = JSON.parse(response.body);
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(400);
      expect(body).to.have.property('id').that.is.eql('LICENSE_ALREADY_ACTIVE');
      expect(body).to.not.be.empty;
    });
  });

  it('Should validate active license', () => {
    return actions.license.validate.run({
      body: {
        "identifier": deviceId
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
        "identifier": "wrongidentifier"
      },
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      const body = JSON.parse(response.body);

      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(400);
      expect(body).to.have.property('id').that.is.eql('IDENTIFIER_MISMATCH');
      expect(body).to.not.be.empty;
    });
  });

  it('Should respond with 404 `LICENSE_NOT_FOUND` on validation if license key is invalid', () => {
    return actions.license.validate.run({
      body: {
        "identifier": "wrongidentifier"
      },
      pathParameters: {
        value: 'invalidlicensekey'
      }
    }).then((response) => {
      const body = JSON.parse(response.body);
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(404);
      expect(body).to.have.property('id').that.is.eql('LICENSE_NOT_FOUND');
      expect(body).to.not.be.empty;
    });
  });

  it('Should respond with 400 `MISSING_PARAMETERS` on validation if required params are not provided', () => {
    return actions.license.validate.run({
      pathParameters: {
        value: license.key
      }
    }).then((response) => {
      const body = JSON.parse(response.body);
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(400);
      expect(body).to.have.property('id').that.is.eql('MISSING_PARAMETERS');
      expect(body).to.not.be.empty;
    });
  });

  it('Should respond with 400 `LICENSE_EXPIRED` on validation if license has expired', async () => {

    await sleep(3000); // Sleep for the plans duration (3s)

    const response = await actions.license.validate.run({
      body: {
        "identifier": deviceId
      },
      pathParameters: {
        value: license.key
      }
    })

    const body = JSON.parse(response.body);
    expect(response).to.not.be.empty;
    expect(response.statusCode).to.be.eql(400);
    expect(body).to.have.property('id').that.is.eql('LICENSE_EXPIRED');
    expect(body).to.not.be.empty;

  });
});
