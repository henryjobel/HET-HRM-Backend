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

    // Product details
    measurementSize: { type: String, trim: true },        // e.g. "56×46×16mm"
    qty: { type: Number, default: 1, min: 1 },            // quantity

    // Shared fields
    productPrice: { type: Number, default: 0, min: 0 },   // unit price in China/source
    shippingCharge: { type: Number, default: 0, min: 0 },

    // International-only fields
    chinaLocalCourierCharge: { type: Number, default: 0, min: 0 },
    bdCourierCharge: { type: Number, default: 0, min: 0 },

    // National-only field
    courierCharge: { type: Number, default: 0, min: 0 },

    // Add (overhead) costs — applied per unit after receiving
    establishmentCost: { type: Number, default: 0, min: 0 },
    packagingCost:     { type: Number, default: 0, min: 0 },
    localCourierCost:  { type: Number, default: 0, min: 0 },
    advertisingCost:   { type: Number, default: 0, min: 0 },

    // Calculated fields
    totalCost:              { type: Number, default: 0 }, // sum of all import costs
    unitPriceAfterReceiving:{ type: Number, default: 0 }, // totalCost ÷ qty

    // Profit & selling price
    profitPercent: { type: Number, default: 0, min: 0 },
    // sellingPrice = unitPriceAfterReceiving×(1+profitPercent/100) + overhead per unit
    sellingPrice:  { type: Number, default: 0 },

    image: { type: String, default: null },
    imagePublicId: { type: String, default: null },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-calculate derived fields before save
productCostSchema.pre('save', function (next) {
  const qty = this.qty || 1;

  if (this.type === 'international') {
    this.totalCost =
      (this.productPrice || 0) * qty +
      (this.chinaLocalCourierCharge || 0) +
      (this.shippingCharge || 0) +
      (this.bdCourierCharge || 0);
  } else {
    this.totalCost =
      (this.productPrice || 0) * qty +
      (this.courierCharge || 0) +
      (this.shippingCharge || 0);
  }

  this.unitPriceAfterReceiving = this.totalCost / qty;

  const overhead =
    (this.establishmentCost || 0) +
    (this.packagingCost || 0) +
    (this.localCourierCost || 0) +
    (this.advertisingCost || 0);

  this.sellingPrice =
    this.unitPriceAfterReceiving * (1 + (this.profitPercent || 0) / 100) + overhead;

  next();
});

module.exports = mongoose.model('ProductCost', productCostSchema);
