const Payment = require('../models/Payment');
const Employee = require('../models/Employee');

// GET /api/payments?company=xxx&month=2026-04
const getPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.month) filter.month = req.query.month;

    const payments = await Payment.find(filter)
      .populate('employee', 'name rank serialNo salary bonus total status')
      .populate('company', 'name')
      .sort({ paidAt: -1 });

    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/payments  — pay a single employee
const createPayment = async (req, res) => {
  try {
    const { employee, company, month, salary, bonus, deduction, method, note } = req.body;

    if (!employee || !company || !month || salary === undefined) {
      return res.status(400).json({ message: 'Employee, company, month and salary are required' });
    }

    const payment = await Payment.create({
      employee,
      company,
      month,
      salary,
      bonus: bonus || 0,
      deduction: deduction || 0,
      method: method || 'bank',
      note,
      paidBy: req.user._id,
    });

    const populated = await payment.populate([
      { path: 'employee', select: 'name rank serialNo salary bonus total status' },
      { path: 'company', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This employee is already paid for this month' });
    }
    res.status(500).json({ message: err.message });
  }
};

// POST /api/payments/bulk  — pay all active employees of a company for a month
const bulkPayment = async (req, res) => {
  try {
    const { company, month, method } = req.body;
    if (!company || !month) {
      return res.status(400).json({ message: 'Company and month are required' });
    }

    const employees = await Employee.find({ company, status: 'active' });
    if (employees.length === 0) {
      return res.status(400).json({ message: 'No active employees found in this company' });
    }

    // Check which employees are already paid
    const existingPayments = await Payment.find({ company, month });
    const paidEmployeeIds = new Set(existingPayments.map((p) => p.employee.toString()));

    const unpaid = employees.filter((e) => !paidEmployeeIds.has(e._id.toString()));
    if (unpaid.length === 0) {
      return res.status(400).json({ message: 'All active employees are already paid for this month' });
    }

    const payments = await Payment.insertMany(
      unpaid.map((e) => ({
        employee: e._id,
        company,
        month,
        salary: e.salary,
        bonus: e.bonus,
        deduction: 0,
        netPaid: e.salary + e.bonus,
        method: method || 'bank',
        paidBy: req.user._id,
      }))
    );

    res.status(201).json({ count: payments.length, message: `${payments.length} employees paid successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/payments/:id  — undo/remove a payment
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/payments/summary?company=xxx&month=2026-04
const getPaymentSummary = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.month) filter.month = req.query.month;

    const payments = await Payment.find(filter);

    const totalPaid = payments.reduce((s, p) => s + p.netPaid, 0);
    const totalSalary = payments.reduce((s, p) => s + p.salary, 0);
    const totalBonus = payments.reduce((s, p) => s + p.bonus, 0);
    const totalDeduction = payments.reduce((s, p) => s + p.deduction, 0);

    // Count active employees in company for that month to calculate unpaid
    let totalActive = 0;
    if (req.query.company) {
      totalActive = await Employee.countDocuments({ company: req.query.company, status: 'active' });
    }

    res.json({
      totalPayments: payments.length,
      totalPaid,
      totalSalary,
      totalBonus,
      totalDeduction,
      totalActive,
      unpaidCount: totalActive - payments.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPayments, createPayment, bulkPayment, deletePayment, getPaymentSummary };
