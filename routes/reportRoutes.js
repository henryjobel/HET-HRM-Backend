const express = require('express');
const router = express.Router();
const { getReport, getDashboard } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getReport);
router.get('/dashboard', getDashboard);

module.exports = router;
