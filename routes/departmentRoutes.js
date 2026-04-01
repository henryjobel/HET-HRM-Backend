const express = require('express');
const router = express.Router();
const {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;
