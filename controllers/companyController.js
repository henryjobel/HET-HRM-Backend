const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Task = require('../models/Task');

// GET /api/companies
const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    // Attach employee count
    const result = await Promise.all(
      companies.map(async (c) => {
        const count = await Employee.countDocuments({ company: c._id });
        return { ...c.toObject(), employeeCount: count };
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/companies/:id
const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const employeeCount = await Employee.countDocuments({ company: company._id });
    res.json({ ...company.toObject(), employeeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/companies
const createCompany = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Company name is required' });
    const company = await Company.create({ name, description, createdBy: req.user._id });
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/companies/:id
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/companies/:id
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    // Also delete related employees and tasks
    await Employee.deleteMany({ company: req.params.id });
    await Task.deleteMany({ company: req.params.id });
    res.json({ message: 'Company deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany };
