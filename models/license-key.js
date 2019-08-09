const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const schema = new mongoose.Schema({
  value: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // The id of the service or app the key is created for
  serviceId: {
    type: String,
    required: true,
    index: true
  },

  // A unique identifier of the consumer the key is activated for.
  // ex. a device, an account, a specific session
  identifier: {
    type: String
  },

  plan: {
    required: true,
    type: mongoose.Schema.Types.ObjectId, ref: 'LicenseKeyPlan'
  },

  extra: {
    type: JSON
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
const virtualStatus = schema.virtual('status');
virtualStatus.get(function () {

  let now = new Date().getTime();

  if (!this.activatedAt) {
    return "pending_activation"
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
  let now = new Date().getTime();
  this.updatedAt = now;
  if (!this.createdAt) {
    this.createdAt = now;
  }
  next();
});

const LicenseKey = mongoose.model('LicenseKey', schema);

module.exports = LicenseKey;
