const WorkUpdate = require('../models/WorkUpdate');
const { sendWorkUpdateEmail } = require('../services/mailService');

const WORK_UPDATE_NOTIFY_TO = process.env.WORK_UPDATE_NOTIFY_TO || 'ehasib@gmail.com';

const getWorkUpdates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.employee) filter.employee = req.query.employee;

    const updates = await WorkUpdate.find(filter)
      .populate('employee', 'name rank')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);

    res.json(updates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyWorkUpdates = async (req, res) => {
  try {
    const updates = await WorkUpdate.find({ employee: req.employee._id })
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(updates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMyWorkUpdate = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const details = req.body.details?.trim();
    if (!title || !details) {
      return res.status(400).json({ message: 'Title and work details are required' });
    }

    const company = req.employee.company?._id || req.employee.company;
    const update = await WorkUpdate.create({
      employee: req.employee._id,
      company,
      title,
      details,
    });

    let result = await WorkUpdate.findById(update._id)
      .populate('employee', 'name rank')
      .populate('company', 'name');

    try {
      const emailNotification = await sendWorkUpdateEmail({
        to: WORK_UPDATE_NOTIFY_TO,
        update: result,
        employee: req.employee,
        company: result.company,
      });
      result.emailStatus = emailNotification?.skipped ? 'skipped' : 'sent';
      result.emailSentAt = emailNotification?.skipped ? undefined : new Date();
      result.emailError = emailNotification?.skipped ? 'Mail is not configured' : undefined;
      await result.save();
      result = await WorkUpdate.findById(result._id)
        .populate('employee', 'name rank')
        .populate('company', 'name');
    } catch (mailErr) {
      console.error('Work update email failed:', mailErr.message);
      result.emailStatus = 'failed';
      result.emailError = mailErr.message;
      await result.save();
      result = await WorkUpdate.findById(result._id)
        .populate('employee', 'name rank')
        .populate('company', 'name');
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markWorkUpdateReviewed = async (req, res) => {
  try {
    const update = await WorkUpdate.findByIdAndUpdate(
      req.params.id,
      { status: 'reviewed' },
      { new: true, runValidators: true }
    )
      .populate('employee', 'name rank')
      .populate('company', 'name');

    if (!update) return res.status(404).json({ message: 'Work update not found' });
    res.json(update);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getWorkUpdates,
  getMyWorkUpdates,
  createMyWorkUpdate,
  markWorkUpdateReviewed,
};
