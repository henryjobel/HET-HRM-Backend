const Employee = require('../models/Employee');
const Payment = require('../models/Payment');
const SalaryReminderLog = require('../models/SalaryReminderLog');
const { sendSalaryReminderEmail } = require('../services/mailService');

const REMINDER_TO = process.env.SALARY_REMINDER_TO || 'ehasib@gmail.com';

const getReminderMonth = (now = new Date()) => {
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = previousMonth.getFullYear();
  const month = String(previousMonth.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getDateKey = (now = new Date()) => now.toISOString().split('T')[0];

const runSalaryReminderCheck = async ({ force = false, now = new Date() } = {}) => {
  const day = now.getDate();
  const reminderMonth = getReminderMonth(now);
  const dateKey = getDateKey(now);

  if (!force && (day < 1 || day > 10)) {
    return { skipped: true, message: 'Salary reminders run only from day 1 to 10', month: reminderMonth };
  }

  const existing = await SalaryReminderLog.findOne({ month: reminderMonth, dateKey, to: REMINDER_TO });
  if (existing && !force) {
    return { skipped: true, message: 'Reminder already processed today', month: reminderMonth };
  }

  const activeEmployees = await Employee.find({ status: 'active' })
    .populate('company', 'name')
    .sort({ serialNo: 1, name: 1 });
  const paid = await Payment.find({ month: reminderMonth }).select('employee');
  const paidIds = new Set(paid.map((payment) => String(payment.employee)));
  const unpaidEmployees = activeEmployees.filter((employee) => !paidIds.has(String(employee._id)));

  if (!unpaidEmployees.length) {
    await SalaryReminderLog.findOneAndUpdate(
      { month: reminderMonth, dateKey, to: REMINDER_TO },
      {
        month: reminderMonth,
        dateKey,
        to: REMINDER_TO,
        unpaidCount: 0,
        totalActive: activeEmployees.length,
        status: 'skipped',
        message: 'All active employees are already paid',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { skipped: true, message: 'All active employees are already paid', month: reminderMonth, unpaidCount: 0 };
  }

  try {
    const mailResult = await sendSalaryReminderEmail({
      to: REMINDER_TO,
      reminderMonth,
      unpaidCount: unpaidEmployees.length,
      totalActive: activeEmployees.length,
      unpaidEmployees,
    });

    await SalaryReminderLog.findOneAndUpdate(
      { month: reminderMonth, dateKey, to: REMINDER_TO },
      {
        month: reminderMonth,
        dateKey,
        to: REMINDER_TO,
        unpaidCount: unpaidEmployees.length,
        totalActive: activeEmployees.length,
        status: mailResult?.skipped ? 'skipped' : 'sent',
        message: mailResult?.skipped ? 'Mail credentials are not configured' : 'Reminder sent',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      sent: !mailResult?.skipped,
      skipped: !!mailResult?.skipped,
      message: mailResult?.skipped ? 'Mail credentials are not configured' : 'Reminder sent',
      month: reminderMonth,
      unpaidCount: unpaidEmployees.length,
      totalActive: activeEmployees.length,
    };
  } catch (err) {
    await SalaryReminderLog.findOneAndUpdate(
      { month: reminderMonth, dateKey, to: REMINDER_TO },
      {
        month: reminderMonth,
        dateKey,
        to: REMINDER_TO,
        unpaidCount: unpaidEmployees.length,
        totalActive: activeEmployees.length,
        status: 'failed',
        message: err.message,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    throw err;
  }
};

const checkSalaryReminder = async (req, res) => {
  try {
    const result = await runSalaryReminderCheck({ force: !!req.user && req.query.force === 'true' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { checkSalaryReminder, runSalaryReminderCheck };
