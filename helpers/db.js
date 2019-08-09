const mongoose = require('mongoose');
const mongoString = process.env.mongo_url; // MongoDB Url
mongoose.Promise = Promise;
let isConnected;

module.exports = connectToDatabase = () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return Promise.resolve();
  }

  console.log('=> using new database connection');
  return mongoose.connect(mongoString,
    {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify: false
    })
    .then(db => {
      isConnected = db.connections[0].readyState;
    });

};
