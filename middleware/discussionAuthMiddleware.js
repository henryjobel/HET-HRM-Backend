const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');

const protectDiscussion = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role === 'employee') {
      const employee = await Employee.findById(decoded.id)
        .select('-password')
        .populate('company', 'name')
        .populate('companies', 'name');
      if (!employee) return res.status(401).json({ message: 'Employee not found' });
      req.discussionUser = { type: 'employee', employee };
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Admin not found' });
    req.discussionUser = { type: 'admin', user };
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protectDiscussion };
