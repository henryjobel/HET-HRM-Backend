const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const protectEmployee = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'employee') {
        return res.status(401).json({ message: 'Not authorized as employee' });
      }
      req.employee = await Employee.findById(decoded.id).select('-password').populate('company', 'name').populate('department', 'name');
      if (!req.employee) return res.status(401).json({ message: 'Employee not found' });
      next();
    } catch {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protectEmployee };
