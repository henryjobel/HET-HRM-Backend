const mongoose = require('mongoose');

const discussionMessageSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    senderType: { type: String, enum: ['admin', 'employee'], required: true },
    senderName: { type: String, required: true, trim: true },
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    text: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiscussionMessage', discussionMessageSchema);
