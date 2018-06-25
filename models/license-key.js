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
  plan: {
    type: mongoose.Schema.Types.ObjectId, ref: 'LicenseKeyPlan'
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

/**
 * Virtuals
 * @type {VirtualType}
 */
var virtualStatus = schema.virtual('status');
virtualStatus.get(function () {

  let now = new Date().getTime();

  if (!this.activatedAt) {
    return "pending"
  }


  if (this.expiresAt >= now) {
    return "active"
  }

  if (this.expiresAt < now) {
    return "expired"
  }
});

schema.set('toJSON', {
  virtuals: true
});


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