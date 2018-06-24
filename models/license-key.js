const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
// const validator = require('validator');

const schema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true
  },
  serviceId: {
    type: String,
    required: true
  },
  consumerId: {
    type: String
  },
  activatedAt: {
    type: Number
  },
  expiresAt: {
    type: Number
  },
  createdAt: {
    type: Number
  },
  updatedAt: {
    type: Number
  }
});
schema.plugin(mongoosePaginate);

schema.pre('save', function (next) {
  now = new Date().getTime();
  this.updatedAt = now;
  if (!this.createdAt) {
    this.createdAt = now;
  }
  next();
});


var LicenseKey = mongoose.model('LicenseKey', schema);

module.exports = LicenseKey;