'use strict';

process.env.NODE_ENV = 'test';

// tests for createPlan
// Generated by serverless-mocha-plugin
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
    delete: mochaPlugin.getWrapper('deleteLicense', '/handlers/licenses.js', 'delete')
  }
}
let planId;
let serviceId = 'testService';
let deviceId = 'testDevice';
let license;


function dropDB(done) {
  const mongoose = require('mongoose');
  /* Connect to the DB */
  mongoose.connect(process.env.mongo_url_test,function(){
    /* Drop the DB */
    mongoose.connection.db.dropDatabase();
    done();
  });
}


function deletePlan() {
  return actions.plan.delete.run({
    pathParameters: {
      "id": planId
    }
  }).then((response) => {
    console.log('Deleted plan ' + response)
    return response;
  })
}

function deleteLicense() {
  return actions.license.delete.run({
    pathParameters: {
      "id": license._id
    }
  }).then((response) => {
    console.log('Deleted license ' + planId)
    return response;
  })
}

describe('createPlan', () => {

  after((done) => {
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
      expect(response).to.not.be.empty;
      expect(response.statusCode).to.be.eql(200);
      expect(response.body).to.not.be.empty;
      const body = JSON.parse(response.body);
      expect(body).to.have.property('_id');
      planId = body._id;
    });
  });

  it('Should create a license for that plan', () => {
    console.log("serviceId", serviceId);
    console.log("plan", planId);
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
    console.log("license", license);
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
});