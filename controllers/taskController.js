const Task = require('../models/Task');
const { sendTaskAssignedEmail } = require('../services/mailService');

const sendAssignmentEmail = async (task) => {
  try {
    return await sendTaskAssignedEmail({
      to: task.employee?.email,
      employeeName: task.employee?.name,
      companyName: task.company?.name,
      task,
    });
  } catch (mailErr) {
    console.error('Task assignment email failed:', mailErr.message);
    return { sent: false, error: mailErr.message };
  }
};

// GET /api/tasks?company=id&employee=id
const getTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;
    if (req.query.employee) filter.employee = req.query.employee;
    const tasks = await Task.find(filter)
      .populate('employee', 'name rank')
      .populate('company', 'name')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { employee, employees, company, title, description, status, priority, deadline } = req.body;
    const employeeIds = Array.isArray(employees) ? employees.filter(Boolean) : [employee].filter(Boolean);
    const uniqueEmployeeIds = [...new Set(employeeIds)];

    if (!uniqueEmployeeIds.length || !company || !title) {
      return res.status(400).json({ message: 'employee(s), company and title are required' });
    }

    const docs = uniqueEmployeeIds.map((employeeId) => ({
      employee: employeeId,
      company,
      title,
      description,
      status,
      priority,
      deadline,
    }));

    const created = await Task.insertMany(docs);
    const populated = await Task.find({ _id: { $in: created.map((task) => task._id) } })
      .populate('employee', 'name rank email')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    const results = [];
    for (const task of populated) {
      const result = task.toObject();
      result.emailNotification = await sendAssignmentEmail(task);
      results.push(result);
    }

    if (results.length === 1) return res.status(201).json(results[0]);
    res.status(201).json({ count: results.length, tasks: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('employee', 'name rank').populate('company', 'name');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
