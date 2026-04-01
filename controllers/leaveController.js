const Leave = require('../models/Leave');

// GET /api/leaves?company=xxx&status=pending&employee=xxx
const getLeaves = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.employee) filter.employee = req.query.employee;
    if (req.query.status) filter.status = req.query.status;

    const leaves = await Leave.find(filter)
      .populate('employee', 'name rank serialNo status')
      .populate('company', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/leaves
const createLeave = async (req, res) => {
  try {
    const { employee, company, type, startDate, endDate, reason } = req.body;
    if (!employee || !company || !type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const leave = await Leave.create({ employee, company, type, startDate, endDate, reason });

    const populated = await leave.populate([
      { path: 'employee', select: 'name rank serialNo status' },
      { path: 'company', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/leaves/:id/approve
const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id },
      { new: true }
    )
      .populate('employee', 'name rank serialNo status')
      .populate('company', 'name')
      .populate('approvedBy', 'name');

    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/leaves/:id/reject
const rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', approvedBy: req.user._id, rejectionNote: req.body.rejectionNote || '' },
      { new: true }
    )
      .populate('employee', 'name rank serialNo status')
      .populate('company', 'name')
      .populate('approvedBy', 'name');

    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/leaves/:id
const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/leaves/summary?company=xxx
const getLeaveSummary = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;

    const leaves = await Leave.find(filter);
    const summary = {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      rejected: leaves.filter((l) => l.status === 'rejected').length,
      totalDays: leaves.filter((l) => l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0),
      byType: {},
    };

    ['sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other'].forEach((t) => {
      summary.byType[t] = leaves.filter((l) => l.type === t).length;
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getLeaves, createLeave, approveLeave, rejectLeave, deleteLeave, getLeaveSummary };
