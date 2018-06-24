const mongoose = require('mongoose');
const Promise = require('bluebird');
const mongoString = 'mongodb://localhost:27017/licensing?poolSize=4'; // MongoDB Url
mongoose.Promise = Promise;
let isConnected;

module.exports = connectToDatabase = () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return Promise.resolve();
  }

  console.log('=> using new database connection');
  return mongoose.connect(mongoString)
    .then(db => {
      isConnected = db.connections[0].readyState;
    });
};