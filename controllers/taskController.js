const Task = require('../models/Task');
const { sendTaskAssignedEmail } = require('../services/mailService');

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
    const { employee, company, title, description, status, priority, deadline } = req.body;
    if (!employee || !company || !title)
      return res.status(400).json({ message: 'employee, company and title are required' });
    const task = await Task.create({ employee, company, title, description, status, priority, deadline });
    const populated = await task.populate([
      { path: 'employee', select: 'name rank email' },
      { path: 'company', select: 'name' },
    ]);

    let emailNotification = { skipped: true };
    try {
      emailNotification = await sendTaskAssignedEmail({
        to: populated.employee?.email,
        employeeName: populated.employee?.name,
        companyName: populated.company?.name,
        task: populated,
      });
    } catch (mailErr) {
      emailNotification = { sent: false, error: mailErr.message };
      console.error('Task assignment email failed:', mailErr.message);
    }

    const result = populated.toObject();
    result.emailNotification = emailNotification;
    res.status(201).json(result);
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
