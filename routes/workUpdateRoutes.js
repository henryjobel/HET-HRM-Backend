const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { protectEmployee } = require('../middleware/employeeAuthMiddleware');
const {
  getWorkUpdates,
  getMyWorkUpdates,
  createMyWorkUpdate,
  markWorkUpdateReviewed,
} = require('../controllers/workUpdateController');

router.get('/', protect, getWorkUpdates);
router.patch('/:id/reviewed', protect, markWorkUpdateReviewed);
router.get('/my', protectEmployee, getMyWorkUpdates);
router.post('/my', protectEmployee, createMyWorkUpdate);

module.exports = router;
