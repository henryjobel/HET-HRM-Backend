const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    type: {
      type: String,
      enum: ['sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-calculate days
leaveSchema.pre('save', function (next) {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  this.days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  next();
});

module.exports = mongoose.model('Leave', leaveSchema);
