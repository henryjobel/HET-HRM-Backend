const Employee = require('../models/Employee');

const normalizeCompanies = (company, companies = []) => {
  const values = Array.isArray(companies) ? companies : [];
  const ids = [...new Set([company, ...values].filter(Boolean).map(String))];
  return ids;
};

// GET /api/employees?company=id
const getEmployees = async (req, res) => {
  try {
    const filter = req.query.company
      ? { $or: [{ company: req.query.company }, { companies: req.query.company }] }
      : {};
    const employees = await Employee.find(filter)
      .select('-password')
      .populate('company', 'name')
      .populate('companies', 'name')
      .sort({ serialNo: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .select('-password')
      .populate('company', 'name')
      .populate('companies', 'name');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/employees
const createEmployee = async (req, res) => {
  try {
    const { company, companies, name, rank, joiningDate, salary, bonus, email, phone, password } = req.body;
    const companyIds = normalizeCompanies(company, companies);
    const primaryCompany = companyIds[0];
    if (!primaryCompany || !name || !rank || !joiningDate || salary === undefined)
      return res.status(400).json({ message: 'Required fields missing' });

    if (email) {
      const exists = await Employee.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already registered' });
    }

    // Auto-assign serial number
    const count = await Employee.countDocuments({ company: primaryCompany });
    const employee = await Employee.create({
      company: primaryCompany,
      companies: companyIds,
      serialNo: count + 1,
      name,
      rank,
      joiningDate,
      salary,
      bonus: bonus || 0,
      email: email || undefined,
      phone: phone || undefined,
      password: password || undefined,
    });
    const result = employee.toObject();
    delete result.password;
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { salary, bonus, password, company, companies, ...rest } = req.body;
    const updateData = { ...rest };
    const companyIds = normalizeCompanies(company, companies);
    if (companyIds.length) {
      updateData.company = companyIds[0];
      updateData.companies = companyIds;
    }
    if (salary !== undefined) updateData.salary = salary;
    if (bonus !== undefined) updateData.bonus = bonus;
    if (salary !== undefined || bonus !== undefined) {
      const existing = await Employee.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Employee not found' });
      updateData.total = (updateData.salary ?? existing.salary) + (updateData.bonus ?? existing.bonus);
    }

    // Handle password update via save (for bcrypt hashing)
    if (password) {
      const emp = await Employee.findById(req.params.id);
      if (!emp) return res.status(404).json({ message: 'Employee not found' });
      Object.assign(emp, updateData);
      emp.password = password;
      emp.total = (updateData.salary ?? emp.salary) + (updateData.bonus ?? emp.bonus);
      await emp.save();
      const result = emp.toObject();
      delete result.password;
      return res.json(result);
    }

    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
