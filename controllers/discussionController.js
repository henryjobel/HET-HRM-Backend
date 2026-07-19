const DiscussionMessage = require('../models/DiscussionMessage');

const getCompanyIds = (employee) => {
  const ids = [];
  if (employee.company?._id || employee.company) ids.push(String(employee.company._id || employee.company));
  (employee.companies || []).forEach((company) => ids.push(String(company._id || company)));
  return [...new Set(ids)];
};

const getMessages = async (req, res) => {
  try {
    const filter = {};
    if (req.discussionUser.type === 'employee') {
      const companyIds = getCompanyIds(req.discussionUser.employee);
      if (req.query.company) {
        if (!companyIds.includes(String(req.query.company))) {
          return res.status(403).json({ message: 'You are not assigned to this company' });
        }
        filter.$or = [{ company: req.query.company }, { company: null }];
      } else {
        filter.$or = [{ company: { $in: companyIds } }, { company: null }];
      }
    } else if (Object.prototype.hasOwnProperty.call(req.query, 'company')) {
      filter.company = req.query.company || null;
    }

    const messages = await DiscussionMessage.find(filter)
      .populate('company', 'name')
      .populate('senderEmployee', 'name rank')
      .populate('senderUser', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMessage = async (req, res) => {
  try {
    const text = req.body.text?.trim();
    if (!text) return res.status(400).json({ message: 'Message is required' });

    let company = req.body.company || null;
    const payload = { text, company };

    if (req.discussionUser.type === 'employee') {
      const employee = req.discussionUser.employee;
      const companyIds = getCompanyIds(employee);
      company = company || companyIds[0] || null;
      if (company && !companyIds.includes(String(company))) {
        return res.status(403).json({ message: 'You are not assigned to this company' });
      }
      Object.assign(payload, {
        company,
        senderType: 'employee',
        senderName: employee.name,
        senderEmployee: employee._id,
      });
    } else {
      Object.assign(payload, {
        senderType: 'admin',
        senderName: req.discussionUser.user.name,
        senderUser: req.discussionUser.user._id,
      });
    }

    let message = await DiscussionMessage.create(payload);
    message = await DiscussionMessage.findById(message._id)
      .populate('company', 'name')
      .populate('senderEmployee', 'name rank')
      .populate('senderUser', 'name email');

    const io = req.app.get('io');
    if (io) {
      const room = message.company?._id ? `company:${message.company._id}` : 'discussion:global';
      io.to(room).emit('discussion:message', message);
      io.to('discussion:admins').emit('discussion:message', message);
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMessages, createMessage };
