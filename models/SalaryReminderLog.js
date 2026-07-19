const mongoose = require('mongoose');

const salaryReminderLogSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    dateKey: { type: String, required: true },
    to: { type: String, required: true },
    unpaidCount: { type: Number, default: 0 },
    totalActive: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['sent', 'skipped', 'failed'],
      default: 'sent',
    },
    message: { type: String },
  },
  { timestamps: true }
);

salaryReminderLogSchema.index({ month: 1, dateKey: 1, to: 1 }, { unique: true });

module.exports = mongoose.model('SalaryReminderLog', salaryReminderLogSchema);
