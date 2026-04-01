const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Task = require('../models/Task');

// GET /api/reports?company=id&months=3|6|12
const getReport = async (req, res) => {
  try {
    const { company, months } = req.query;
    const duration = parseInt(months) || 12;

    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - duration);

    const filter = { joiningDate: { $lte: new Date() } };
    if (company) filter.company = company;

    const employees = await Employee.find(filter).populate('company', 'name');

    // Filter employees whose joining date is within the report window
    const inWindow = employees.filter((e) => new Date(e.joiningDate) >= dateFrom);

    const totalSalary = inWindow.reduce((sum, e) => sum + e.salary, 0);
    const totalBonus = inWindow.reduce((sum, e) => sum + e.bonus, 0);
    const totalCost = totalSalary + totalBonus;

    res.json({
      months: duration,
      employeeCount: inWindow.length,
      totalSalary,
      totalBonus,
      totalCost,
      employees: inWindow,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reports/dashboard
const getDashboard = async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });

    // Current month salary expense
    const now = new Date();
    const monthlyEmployees = await Employee.find({ joiningDate: { $lte: now } });
    const monthlySalaryExpense = monthlyEmployees.reduce((sum, e) => sum + e.total, 0);

    // Task stats
    const tasksPending = await Task.countDocuments({ status: 'pending' });
    const tasksInProgress = await Task.countDocuments({ status: 'in-progress' });
    const tasksCompleted = await Task.countDocuments({ status: 'completed' });
    const totalTasks = tasksPending + tasksInProgress + tasksCompleted;

    // 5 most recent employees
    const recentEmployees = await Employee.find()
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalCompanies,
      totalEmployees,
      activeEmployees,
      monthlySalaryExpense,
      tasks: { total: totalTasks, pending: tasksPending, inProgress: tasksInProgress, completed: tasksCompleted },
      recentEmployees,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getReport, getDashboard };
