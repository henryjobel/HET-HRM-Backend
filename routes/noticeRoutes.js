const express = require('express');
const router = express.Router();
const {
  getNotices, createNotice, updateNotice, deleteNotice,
} = require('../controllers/noticeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotices);
router.post('/', createNotice);
router.put('/:id', updateNotice);
router.delete('/:id', deleteNotice);

module.exports = router;
