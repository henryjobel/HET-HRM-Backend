const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    companies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    serialNo: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, minlength: 6 },
    rank: { type: String, required: true, trim: true },
    joiningDate: { type: Date, required: true },
    salary: { type: Number, required: true, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    total: { type: Number },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on-leave'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Hash password before save
employeeSchema.pre('save', async function (next) {
  this.total = this.salary + this.bonus;
  if (this.company && (!this.companies || this.companies.length === 0)) {
    this.companies = [this.company];
  }
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

employeeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Also recalculate on findOneAndUpdate
employeeSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.salary !== undefined || update.bonus !== undefined) {
    const salary = update.salary ?? 0;
    const bonus = update.bonus ?? 0;
    update.total = salary + bonus;
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);
