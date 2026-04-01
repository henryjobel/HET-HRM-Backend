const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');

const generateToken = (id) =>
  jwt.sign({ id, role: 'employee' }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @desc  Employee login
// @route POST /api/employee-auth/login
const employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const employee = await Employee.findOne({ email }).populate('company', 'name').populate('department', 'name');
    if (!employee || !employee.password)
      return res.status(401).json({ message: 'Invalid credentials' });

    if (employee.status !== 'active')
      return res.status(401).json({ message: 'Account is not active. Contact admin.' });

    const isMatch = await employee.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: 'employee',
      company: employee.company,
      department: employee.department,
      rank: employee.rank,
      token: generateToken(employee._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Get current employee profile
// @route GET /api/employee-auth/me
const getEmployeeMe = async (req, res) => {
  res.json({ ...req.employee.toObject(), role: 'employee' });
};

module.exports = { employeeLogin, getEmployeeMe };
