const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  alias : {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  duration: {
    type: String
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


var LicenseKeyPlan = mongoose.model('LicenseKeyPlan', schema);

module.exports = LicenseKeyPlan;