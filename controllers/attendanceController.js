const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// GET /api/attendance?company=xxx&date=2026-04-01&month=2026-04
const getAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.employee) filter.employee = req.query.employee;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.month) {
      filter.date = { $regex: `^${req.query.month}` };
    }

    const records = await Attendance.find(filter)
      .populate('employee', 'name rank serialNo status')
      .populate('company', 'name')
      .populate('markedByEmployee', 'name rank serialNo')
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/attendance — mark single
const markAttendance = async (req, res) => {
  try {
    const { employee, company, date, status, checkIn, checkOut, overtime, note } = req.body;
    if (!employee || !company || !date) {
      return res.status(400).json({ message: 'Employee, company and date are required' });
    }

    const record = await Attendance.create({
      employee, company, date, status: status || 'present',
      checkIn, checkOut, overtime: overtime || 0, note,
      markedBy: req.user._id,
    });

    const populated = await record.populate([
      { path: 'employee', select: 'name rank serialNo status' },
      { path: 'company', select: 'name' },
      { path: 'markedByEmployee', select: 'name rank serialNo' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this employee on this date' });
    }
    res.status(500).json({ message: err.message });
  }
};

// POST /api/attendance/bulk — mark attendance for all active employees of a company
const bulkMarkAttendance = async (req, res) => {
  try {
    const { company, date, status, checkIn, checkOut } = req.body;
    if (!company || !date) {
      return res.status(400).json({ message: 'Company and date are required' });
    }

    const employees = await Employee.find({ company, status: 'active' });
    if (employees.length === 0) {
      return res.status(400).json({ message: 'No active employees found' });
    }

    const existing = await Attendance.find({ company, date });
    const markedIds = new Set(existing.map((a) => a.employee.toString()));
    const unmarked = employees.filter((e) => !markedIds.has(e._id.toString()));

    if (unmarked.length === 0) {
      return res.status(400).json({ message: 'All employees already marked for this date' });
    }

    const records = await Attendance.insertMany(
      unmarked.map((e) => ({
        employee: e._id, company, date,
        status: status || 'present',
        checkIn, checkOut,
        markedBy: req.user._id,
      }))
    );

    res.status(201).json({ count: records.length, message: `${records.length} employees marked` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/attendance/:id
const updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('employee', 'name rank serialNo status')
      .populate('company', 'name')
      .populate('markedByEmployee', 'name rank serialNo');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/attendance/:id
const deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/attendance/summary?company=xxx&month=2026-04
const getAttendanceSummary = async (req, res) => {
  try {
    const { company, month } = req.query;
    if (!company || !month) {
      return res.status(400).json({ message: 'Company and month required' });
    }

    const records = await Attendance.find({ company, date: { $regex: `^${month}` } });
    const totalActive = await Employee.countDocuments({ company, status: 'active' });

    const summary = {
      totalRecords: records.length,
      totalActive,
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      halfDay: records.filter((r) => r.status === 'half-day').length,
      totalOvertime: records.reduce((s, r) => s + (r.overtime || 0), 0),
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAttendance, markAttendance, bulkMarkAttendance, updateAttendance, deleteAttendance, getAttendanceSummary };
