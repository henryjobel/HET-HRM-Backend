const nodemailer = require('nodemailer');

const isMailEnabled = () => (
  process.env.MAIL_USER &&
  process.env.MAIL_PASS
);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT || 465),
  secure: process.env.MAIL_SECURE ? process.env.MAIL_SECURE === 'true' : true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendTaskAssignedEmail = async ({ to, employeeName, task, companyName }) => {
  if (!isMailEnabled() || !to) return { skipped: true };

  const transporter = createTransporter();
  const deadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No deadline';

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: `New task assigned: ${task.title}`,
    text: [
      `Hello ${employeeName || 'Employee'},`,
      '',
      `A new task has been assigned to you${companyName ? ` for ${companyName}` : ''}.`,
      '',
      `Title: ${task.title}`,
      `Priority: ${task.priority || 'medium'}`,
      `Status: ${task.status || 'pending'}`,
      `Deadline: ${deadline}`,
      '',
      task.description ? `Details: ${task.description}` : '',
      '',
      'Please log in to the HET HRM employee portal to review and update your progress.',
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">New task assigned</h2>
        <p>Hello ${employeeName || 'Employee'},</p>
        <p>A new task has been assigned to you${companyName ? ` for <strong>${companyName}</strong>` : ''}.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 12px;color:#6b7280">Title</td><td style="padding:6px 12px"><strong>${task.title}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280">Priority</td><td style="padding:6px 12px">${task.priority || 'medium'}</td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280">Status</td><td style="padding:6px 12px">${task.status || 'pending'}</td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280">Deadline</td><td style="padding:6px 12px">${deadline}</td></tr>
        </table>
        ${task.description ? `<p>${task.description}</p>` : ''}
        <p>Please log in to the HET HRM employee portal to review and update your progress.</p>
      </div>
    `,
  });

  return { sent: true };
};

const sendSalaryReminderEmail = async ({ to, reminderMonth, unpaidCount, totalActive, unpaidEmployees }) => {
  if (!isMailEnabled() || !to) return { skipped: true };

  const transporter = createTransporter();
  const employeeLines = (unpaidEmployees || [])
    .slice(0, 20)
    .map((employee, index) => `${index + 1}. ${employee.name} - ${employee.rank || 'Employee'} (${employee.company?.name || 'Company'})`);

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: `Salary reminder: ${unpaidCount} unpaid employee(s) for ${reminderMonth}`,
    text: [
      'Hello Sir,',
      '',
      `Salary reminder for month: ${reminderMonth}`,
      `Total active employees: ${totalActive}`,
      `Unpaid employees: ${unpaidCount}`,
      '',
      employeeLines.length ? 'Unpaid list:' : '',
      ...employeeLines,
      unpaidCount > employeeLines.length ? `...and ${unpaidCount - employeeLines.length} more` : '',
      '',
      'Please log in to HET HRM and complete salary payments.',
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Salary reminder</h2>
        <p>Hello Sir,</p>
        <p>Please complete salary payments in HET HRM.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 12px;color:#6b7280">Month</td><td style="padding:6px 12px"><strong>${reminderMonth}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280">Total active employees</td><td style="padding:6px 12px">${totalActive}</td></tr>
          <tr><td style="padding:6px 12px;color:#6b7280">Unpaid employees</td><td style="padding:6px 12px"><strong>${unpaidCount}</strong></td></tr>
        </table>
        ${employeeLines.length ? `<p><strong>Unpaid list</strong></p><ol>${employeeLines.map((line) => `<li>${line.replace(/^\d+\.\s*/, '')}</li>`).join('')}</ol>` : ''}
        ${unpaidCount > employeeLines.length ? `<p>...and ${unpaidCount - employeeLines.length} more</p>` : ''}
      </div>
    `,
  });

  return { sent: true };
};

module.exports = { sendTaskAssignedEmail, sendSalaryReminderEmail };
