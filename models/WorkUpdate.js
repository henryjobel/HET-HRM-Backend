const mongoose = require('mongoose');

const workUpdateSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    details: { type: String, required: true, trim: true, maxlength: 6000 },
    status: {
      type: String,
      enum: ['submitted', 'reviewed'],
      default: 'submitted',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkUpdate', workUpdateSchema);
