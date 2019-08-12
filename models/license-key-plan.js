const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const License = require('./license-key');
const Errors = require('../helpers/errors');

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
    type: String,
    validate: {
      validator: function(v) {
        const validDurations = ['seconds','minutes', 'hours', 'days', 'weeks', 'months', 'years'];
        const parts = v.split(" ");
        if(parts.length !== 2) return false;
        if(isNaN(parts[0])) return false;
        if(validDurations.indexOf(parts[1]) < 0) return false;
        return true;
      },
      message: props => `${props.value} is not a valid duration!`
    },
    required: [true, 'A duration is required']
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

schema.pre('remove', function(next) {
  // Check if there are any Licenses using this plan.
  return next(new Errors.BadRequestError('The plan cannot be deleted because there are licenses still using it. Remove those licenses first.'));
});

const LicenseKeyPlan = mongoose.model('LicenseKeyPlan', schema);

module.exports = LicenseKeyPlan;
