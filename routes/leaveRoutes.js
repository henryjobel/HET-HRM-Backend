const express = require('express');
const router = express.Router();
const {
  getLeaves, createLeave, approveLeave, rejectLeave, deleteLeave, getLeaveSummary,
} = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summary', getLeaveSummary);
router.get('/', getLeaves);
router.post('/', createLeave);
router.put('/:id/approve', approveLeave);
router.put('/:id/reject', rejectLeave);
router.delete('/:id', deleteLeave);

module.exports = router;
