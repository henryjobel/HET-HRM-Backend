const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Employee = require('./models/Employee');
require('dotenv').config();

// MongoDB connection caching for serverless environments
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const taskRoutes = require('./routes/taskRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const employeeAuthRoutes = require('./routes/employeeAuthRoutes');
const portalRoutes = require('./routes/portalRoutes');
const productCostRoutes = require('./routes/productCostRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const workUpdateRoutes = require('./routes/workUpdateRoutes');
const salaryReminderRoutes = require('./routes/salaryReminderRoutes');
const { runSalaryReminderCheck } = require('./controllers/salaryReminderController');

const app = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Not authorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userRole = decoded.role === 'employee' ? 'employee' : 'admin';
    if (socket.userRole === 'employee') {
      await connectDB();
      const employee = await Employee.findById(decoded.id).select('company companies');
      socket.companyIds = [
        employee?.company,
        ...(employee?.companies || []),
      ].filter(Boolean).map(String);
    }
    next();
  } catch {
    next(new Error('Not authorized'));
  }
});

io.on('connection', (socket) => {
  if (socket.userRole === 'admin') {
    socket.join('discussion:admins');
  }
  (socket.companyIds || []).forEach((companyId) => socket.join(`company:${companyId}`));
  socket.join('discussion:global');
});

app.set('io', io);

// Connect DB before handling requests (serverless-safe)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/employee-auth', employeeAuthRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/product-costs', productCostRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/work-updates', workUpdateRoutes);
app.use('/api/salary-reminders', salaryReminderRoutes);

// Health check
app.get('/', (req, res) => res.json({ message: 'HET HRM API is running' }));

// Start server only in local development (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      isConnected = true;
      console.log('MongoDB connected');
      server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      setTimeout(() => runSalaryReminderCheck().catch((err) => console.error('Salary reminder check failed:', err.message)), 5000);
      setInterval(() => runSalaryReminderCheck().catch((err) => console.error('Salary reminder check failed:', err.message)), 6 * 60 * 60 * 1000);
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
    });
}

module.exports = app;
