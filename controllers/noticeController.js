const Notice = require('../models/Notice');

// GET /api/notices?company=xxx
const getNotices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) {
      filter.$or = [{ company: req.query.company }, { company: null }];
    }

    const notices = await Notice.find(filter)
      .populate('company', 'name')
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notices
const createNotice = async (req, res) => {
  try {
    const { company, title, content, priority, expiresAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const notice = await Notice.create({
      company: company || null,
      title,
      content,
      priority: priority || 'normal',
      expiresAt: expiresAt || null,
      postedBy: req.user._id,
    });

    const populated = await notice.populate([
      { path: 'company', select: 'name' },
      { path: 'postedBy', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notices/:id
const updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('company', 'name')
      .populate('postedBy', 'name');
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notices/:id
const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getNotices, createNotice, updateNotice, deleteNotice };
