const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  bulkPayment,
  deletePayment,
  getPaymentSummary,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summary', getPaymentSummary);
router.get('/', getPayments);
router.post('/bulk', bulkPayment);
router.post('/', createPayment);
router.delete('/:id', deletePayment);

module.exports = router;
