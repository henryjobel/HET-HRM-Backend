const mongoose = require('mongoose');

const productCostSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    productName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['international', 'national'],
      required: true,
    },

    // Shared fields
    productPrice: { type: Number, default: 0, min: 0 },
    shippingCharge: { type: Number, default: 0, min: 0 },

    // International-only fields
    chinaLocalCourierCharge: { type: Number, default: 0, min: 0 },
    bdCourierCharge: { type: Number, default: 0, min: 0 },

    // National-only field
    courierCharge: { type: Number, default: 0, min: 0 },

    // Calculated fields
    totalCost: { type: Number, default: 0 },

    // Profit & selling price
    profitPercent: { type: Number, default: 0, min: 0 }, // profit margin %
    sellingPrice: { type: Number, default: 0 },          // auto = totalCost × (1 + profitPercent/100)

    image: { type: String, default: null },
    imagePublicId: { type: String, default: null },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-calculate totalCost and sellingPrice before save
productCostSchema.pre('save', function (next) {
  if (this.type === 'international') {
    this.totalCost =
      (this.productPrice || 0) +
      (this.chinaLocalCourierCharge || 0) +
      (this.shippingCharge || 0) +
      (this.bdCourierCharge || 0);
  } else {
    this.totalCost =
      (this.productPrice || 0) +
      (this.courierCharge || 0) +
      (this.shippingCharge || 0);
  }
  // sellingPrice = totalCost + profit margin
  this.sellingPrice = this.totalCost * (1 + (this.profitPercent || 0) / 100);
  next();
});

module.exports = mongoose.model('ProductCost', productCostSchema);
