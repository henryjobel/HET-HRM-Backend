const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }, // null = all companies
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['normal', 'important', 'urgent'],
      default: 'normal',
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
