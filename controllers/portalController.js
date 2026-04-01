const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Notice = require('../models/Notice');
const Employee = require('../models/Employee');

// @desc  Get own attendance
// @route GET /api/portal/attendance
const getMyAttendance = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { employee: req.employee._id };
    if (month) {
      // month = YYYY-MM
      const start = `${month}-01`;
      const end = `${month}-31`;
      filter.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get own attendance summary
// @route GET /api/portal/attendance/summary
const getMyAttendanceSummary = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = { employee: req.employee._id };
    if (month) {
      filter.date = { $gte: `${month}-01`, $lte: `${month}-31` };
    }
    const records = await Attendance.find(filter);
    const summary = {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      halfDay: records.filter((r) => r.status === 'half-day').length,
      totalOvertime: records.reduce((s, r) => s + (r.overtime || 0), 0),
      total: records.length,
    };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get own leaves
// @route GET /api/portal/leaves
const getMyLeaves = async (req, res) => {
  try {
    const filter = { employee: req.employee._id };
    if (req.query.status) filter.status = req.query.status;
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Apply for leave
// @route POST /api/portal/leaves
const applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    if (!type || !startDate || !endDate)
      return res.status(400).json({ message: 'Type, start date, and end date required' });

    const leave = await Leave.create({
      employee: req.employee._id,
      company: req.employee.company._id || req.employee.company,
      type,
      startDate,
      endDate,
      reason,
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get own leave summary
// @route GET /api/portal/leaves/summary
const getMyLeaveSummary = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.employee._id });
    const summary = {
      pending: leaves.filter((l) => l.status === 'pending').length,
      approved: leaves.filter((l) => l.status === 'approved').length,
      rejected: leaves.filter((l) => l.status === 'rejected').length,
      totalDays: leaves.filter((l) => l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0),
    };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get own tasks
// @route GET /api/portal/tasks
const getMyTasks = async (req, res) => {
  try {
    const filter = { employee: req.employee._id };
    if (req.query.status) filter.status = req.query.status;
    const tasks = await Task.find(filter).sort({ deadline: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Update task status (employee can mark as in-progress / completed)
// @route PUT /api/portal/tasks/:id
const updateMyTaskStatus = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, employee: req.employee._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.body.status) task.status = req.body.status;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get own payment history
// @route GET /api/portal/payments
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ employee: req.employee._id }).sort({ paidAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get notices for employee's company (or all-company notices)
// @route GET /api/portal/notices
const getMyNotices = async (req, res) => {
  try {
    const companyId = req.employee.company._id || req.employee.company;
    const notices = await Notice.find({
      $and: [
        { $or: [{ company: companyId }, { company: null }] },
        { $or: [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }] },
      ],
    }).populate('postedBy', 'name').sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Update own profile (limited fields)
// @route PUT /api/portal/profile
const updateMyProfile = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const emp = await Employee.findById(req.employee._id);
    if (!emp) return res.status(404).json({ message: 'Not found' });

    if (phone !== undefined) emp.phone = phone;
    if (password) emp.password = password;
    await emp.save();

    const result = emp.toObject();
    delete result.password;
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Dashboard stats for employee
// @route GET /api/portal/dashboard
const getMyDashboard = async (req, res) => {
  try {
    const empId = req.employee._id;
    const companyId = req.employee.company._id || req.employee.company;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const [todayAttendance, monthAttendance, pendingLeaves, pendingTasks, totalTasks, recentPayment, notices] = await Promise.all([
      Attendance.findOne({ employee: empId, date: today }),
      Attendance.find({ employee: empId, date: { $gte: `${currentMonth}-01`, $lte: `${currentMonth}-31` } }),
      Leave.countDocuments({ employee: empId, status: 'pending' }),
      Task.countDocuments({ employee: empId, status: { $in: ['pending', 'in-progress'] } }),
      Task.countDocuments({ employee: empId }),
      Payment.findOne({ employee: empId }).sort({ paidAt: -1 }),
      Notice.find({
        $or: [{ company: companyId }, { company: null }],
      }).sort({ createdAt: -1 }).limit(5).populate('postedBy', 'name'),
    ]);

    const presentDays = monthAttendance.filter((a) => a.status === 'present').length;
    const totalWorkDays = monthAttendance.length;

    res.json({
      todayStatus: todayAttendance ? todayAttendance.status : 'not-marked',
      checkIn: todayAttendance?.checkIn || null,
      checkOut: todayAttendance?.checkOut || null,
      monthPresent: presentDays,
      monthTotal: totalWorkDays,
      pendingLeaves,
      pendingTasks,
      totalTasks,
      completedTasks: totalTasks - pendingTasks,
      lastPayment: recentPayment,
      recentNotices: notices,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyAttendance, getMyAttendanceSummary,
  getMyLeaves, applyLeave, getMyLeaveSummary,
  getMyTasks, updateMyTaskStatus,
  getMyPayments,
  getMyNotices,
  updateMyProfile,
  getMyDashboard,
};
