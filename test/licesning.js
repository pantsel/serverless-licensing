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

describe('createPlan', () => {

  after((done) => {
    // done();
    dropDB(done);
  });

  it('Should create a plan', () => {
    return actions.plan.create.run({
      body: {
        "name": "debug",
        "description": "Debug license",
        "duration": "1 minutes"
      }
    }).then((response) => {
      console.log("Should create a plan => response.statusCode: " + response.statusCode);
      console.log("Should create a plan => response.body: " + response.body);
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

  it('Should activate license', () => {
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

  it('Should respond with 400 `IDENTIFIER_MISMATCH` if wrong identifier is used', () => {
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

  it('Should respond with 404 if license key is invalid', () => {
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

  it('Should respond with 400 `MISSING_PARAMETERS` if required params are not provided', () => {
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

  it('Should respond with 400 `LICENSE_EXPIRED` if license has expired', async () => {

    const oneSecondPlanResponse = await actions.plan.create.run({
      body: {
        "name": "second",
        "description": "One second license",
        "duration": "1 seconds"
      }
    });
    const plan = JSON.parse(oneSecondPlanResponse.body);

    const licenseResponse = await actions.license.create.run({
      body: {
        "serviceId": serviceId,
        "plan": plan._id
      }
    })
    const oneSecondLicense = JSON.parse(licenseResponse.body);

    await actions.license.activate.run({
      body: {
        "serviceId": serviceId,
        "identifier": deviceId
      },
      pathParameters: {
        value: oneSecondLicense.key
      }
    })

    await sleep(3000);

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
