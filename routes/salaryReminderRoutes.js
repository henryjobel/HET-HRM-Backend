const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { checkSalaryReminder } = require('../controllers/salaryReminderController');

router.post('/check', protect, checkSalaryReminder);
router.get('/check', checkSalaryReminder);

module.exports = router;
