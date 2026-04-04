const express = require('express');
const router = express.Router();
const {
  getProductCosts,
  createProductCost,
  updateProductCost,
  deleteProductCost,
  exportExcel,
  exportWord,
} = require('../controllers/productCostController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(protect);

router.get('/export/excel', exportExcel);
router.get('/export/word', exportWord);
router.get('/', getProductCosts);
router.post('/', upload.single('image'), createProductCost);
router.put('/:id', upload.single('image'), updateProductCost);
router.delete('/:id', deleteProductCost);

module.exports = router;
