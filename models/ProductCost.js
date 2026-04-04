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

    // International fields
    productPrice: { type: Number, default: 0, min: 0 },
    chinaLocalCourierCharge: { type: Number, default: 0, min: 0 },
    shippingCharge: { type: Number, default: 0, min: 0 },
    bdCourierCharge: { type: Number, default: 0, min: 0 },

    // National-only field (reuses productPrice & shippingCharge above)
    courierCharge: { type: Number, default: 0, min: 0 },

    totalCost: { type: Number },
    image: { type: String, default: null },        // Cloudinary URL
    imagePublicId: { type: String, default: null }, // for deletion
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-calculate totalCost before save
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
  next();
});

module.exports = mongoose.model('ProductCost', productCostSchema);
