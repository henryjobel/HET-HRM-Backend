const Department = require('../models/Department');
const Employee = require('../models/Employee');

// GET /api/departments?company=xxx
const getDepartments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) filter.company = req.query.company;

    const departments = await Department.find(filter)
      .populate('company', 'name')
      .populate('head', 'name rank')
      .sort({ name: 1 });

    // Attach employee count
    const result = await Promise.all(
      departments.map(async (d) => {
        const count = await Employee.countDocuments({ company: d.company._id || d.company, department: d._id });
        return { ...d.toObject(), employeeCount: count };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/departments
const createDepartment = async (req, res) => {
  try {
    const { company, name, description, head } = req.body;
    if (!company || !name) {
      return res.status(400).json({ message: 'Company and name are required' });
    }

    const dept = await Department.create({ company, name, description, head });
    const populated = await dept.populate([
      { path: 'company', select: 'name' },
      { path: 'head', select: 'name rank' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Department already exists in this company' });
    }
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/departments/:id
const updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('company', 'name')
      .populate('head', 'name rank');

    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Department name already exists in this company' });
    }
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    // Unset department from employees
    await Employee.updateMany({ department: req.params.id }, { $unset: { department: '' } });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };
