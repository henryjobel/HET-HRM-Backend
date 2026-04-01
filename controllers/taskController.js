const Task = require('../models/Task');

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
    const { employee, company, title, description, deadline } = req.body;
    if (!employee || !company || !title)
      return res.status(400).json({ message: 'employee, company and title are required' });
    const task = await Task.create({ employee, company, title, description, deadline });
    res.status(201).json(task);
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
    });
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
