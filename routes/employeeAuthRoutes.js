const express = require('express');
const router = express.Router();
const { employeeLogin, getEmployeeMe } = require('../controllers/employeeAuthController');
const { protectEmployee } = require('../middleware/employeeAuthMiddleware');

router.post('/login', employeeLogin);
router.get('/me', protectEmployee, getEmployeeMe);

module.exports = router;
