const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    month: { type: String, required: true }, // e.g. "2026-04"
    salary: { type: Number, required: true, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deduction: { type: Number, default: 0, min: 0 },
    netPaid: { type: Number },
    method: {
      type: String,
      enum: ['bank', 'cash', 'bkash', 'nagad', 'other'],
      default: 'bank',
    },
    note: { type: String, trim: true },
    paidAt: { type: Date, default: Date.now },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-calculate netPaid
paymentSchema.pre('save', function (next) {
  this.netPaid = this.salary + this.bonus - this.deduction;
  next();
});

// Compound index to prevent duplicate payment for same employee+month
paymentSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
