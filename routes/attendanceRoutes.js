const express = require('express');
const router = express.Router();
const {
  getAttendance, markAttendance, bulkMarkAttendance,
  updateAttendance, deleteAttendance, getAttendanceSummary,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summary', getAttendanceSummary);
router.get('/', getAttendance);
router.post('/bulk', bulkMarkAttendance);
router.post('/', markAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

module.exports = router;
