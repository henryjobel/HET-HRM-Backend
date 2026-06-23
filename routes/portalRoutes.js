const express = require('express');
const router = express.Router();
const { protectEmployee } = require('../middleware/employeeAuthMiddleware');
const { taskFileUpload } = require('../middleware/uploadMiddleware');
const {
  getMyAttendance, getMyAttendanceSummary,
  submitMyAttendance,
  getMyLeaves, applyLeave, getMyLeaveSummary,
  getMyTasks, updateMyTaskStatus,
  getMyPayments,
  getMyNotices,
  updateMyProfile,
  getMyDashboard,
} = require('../controllers/portalController');

// All routes require employee auth
router.use(protectEmployee);

router.get('/dashboard', getMyDashboard);
router.get('/attendance/summary', getMyAttendanceSummary);
router.get('/attendance', getMyAttendance);
router.post('/attendance', submitMyAttendance);
router.get('/leaves/summary', getMyLeaveSummary);
router.get('/leaves', getMyLeaves);
router.post('/leaves', applyLeave);
router.get('/tasks', getMyTasks);
router.put('/tasks/:id', taskFileUpload.single('file'), updateMyTaskStatus);
router.get('/payments', getMyPayments);
router.get('/notices', getMyNotices);
router.put('/profile', updateMyProfile);

module.exports = router;
