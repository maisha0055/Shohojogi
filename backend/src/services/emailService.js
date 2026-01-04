const nodemailer = require('nodemailer');
const { EMAIL_SUBJECTS } = require('../config/constants');

// Check if email is configured
const isEmailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;

// Create transporter only if email is configured
let transporter = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Verify transporter (non-blocking)
  transporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️  Email service configuration issue:', error.message);
      console.warn('   Email functionality will be disabled. To enable emails, configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD in .env');
      transporter = null; // Disable email if verification fails
    } else {
      console.log('✓ Email service is ready');
    }
  });
} else {
  console.warn('⚠️  Email service not configured. Email functionality will be disabled.');
  console.warn('   To enable emails, add EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD to your .env file');
}

// Send email
const sendEmail = async (to, subject, html) => {
  // If email is not configured or transporter is null, skip sending
  if (!isEmailConfigured || !transporter) {
    console.warn(`⚠️  Email not sent (service not configured): ${subject} to ${to}`);
    return { success: false, error: 'Email service not configured', skipped: true };
  }

  try {
    const mailOptions = {
      from: `"WorkerCall" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, error: error.message };
  }
};

// Welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to WorkerCall!</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for joining WorkerCall. We're excited to have you on board!</p>
      <p>You can now:</p>
      <ul>
        <li>Search for professional workers</li>
        <li>Book services instantly or schedule for later</li>
        <li>Track your bookings</li>
        <li>Leave reviews and ratings</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(userEmail, EMAIL_SUBJECTS.WELCOME, html);
};

// Booking confirmation email
const sendBookingConfirmationEmail = async (userEmail, bookingDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Booking Confirmed!</h2>
      <p>Your booking has been created successfully.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Booking Number:</strong> ${bookingDetails.bookingNumber}</p>
        <p><strong>Worker:</strong> ${bookingDetails.workerName}</p>
        <p><strong>Service:</strong> ${bookingDetails.serviceDescription}</p>
        <p><strong>Location:</strong> ${bookingDetails.location}</p>
        ${bookingDetails.scheduledDate ? `<p><strong>Scheduled:</strong> ${bookingDetails.scheduledDate} at ${bookingDetails.scheduledTime}</p>` : ''}
        <p><strong>Estimated Price:</strong> ৳${bookingDetails.estimatedPrice}</p>
      </div>
      <p>We'll notify you once the worker accepts your booking.</p>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(userEmail, EMAIL_SUBJECTS.BOOKING_CREATED, html);
};

// Booking accepted email
const sendBookingAcceptedEmail = async (userEmail, bookingDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Booking Accepted!</h2>
      <p>Great news! Your booking has been accepted by the worker.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Booking Number:</strong> ${bookingDetails.bookingNumber}</p>
        <p><strong>Worker:</strong> ${bookingDetails.workerName}</p>
        <p><strong>Phone:</strong> ${bookingDetails.workerPhone}</p>
      </div>
      <p>The worker will arrive at the scheduled time. You can contact them if needed.</p>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(userEmail, EMAIL_SUBJECTS.BOOKING_ACCEPTED, html);
};

// Service completed email
const sendServiceCompletedEmail = async (userEmail, bookingDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Service Completed!</h2>
      <p>Your service has been completed successfully.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Booking Number:</strong> ${bookingDetails.bookingNumber}</p>
        <p><strong>Final Price:</strong> ৳${bookingDetails.finalPrice}</p>
      </div>
      <p>We hope you're satisfied with the service. Please take a moment to leave a review.</p>
      <a href="${process.env.FRONTEND_URL}/bookings/${bookingDetails.bookingId}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Leave a Review
      </a>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(userEmail, EMAIL_SUBJECTS.BOOKING_COMPLETED, html);
};

// Verification approved email
const sendVerificationApprovedEmail = async (workerEmail, workerName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Verification Approved!</h2>
      <p>Hi ${workerName},</p>
      <p>Congratulations! Your profile has been verified and approved.</p>
      <p>You can now:</p>
      <ul>
        <li>Receive booking requests</li>
        <li>Accept jobs</li>
        <li>Earn money</li>
        <li>Build your reputation</li>
      </ul>
      <p>Make sure to keep your availability status updated to receive more bookings.</p>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(workerEmail, EMAIL_SUBJECTS.VERIFICATION_APPROVED, html);
};

// Password reset email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>You requested to reset your password.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Reset Password
      </a>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(userEmail, EMAIL_SUBJECTS.PASSWORD_RESET, html);
};

// New job alert for worker
const sendJobAlertEmail = async (workerEmail, jobDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Job Request!</h2>
      <p>You have a new job request:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Service:</strong> ${jobDetails.serviceDescription}</p>
        <p><strong>Location:</strong> ${jobDetails.location}</p>
        <p><strong>Type:</strong> ${jobDetails.bookingType}</p>
        ${jobDetails.scheduledDate ? `<p><strong>Scheduled:</strong> ${jobDetails.scheduledDate}</p>` : ''}
        <p><strong>Estimated Price:</strong> ৳${jobDetails.estimatedPrice}</p>
      </div>
      <p>Login to accept or reject this job request.</p>
      <a href="${process.env.FRONTEND_URL}/worker-dashboard" 
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin: 20px 0;">
        View Job Request
      </a>
      <p>Best regards,<br>The WorkerCall Team</p>
    </div>
  `;

  return sendEmail(workerEmail, 'New Job Request', html);
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendBookingConfirmationEmail,
  sendBookingAcceptedEmail,
  sendServiceCompletedEmail,
  sendVerificationApprovedEmail,
  sendPasswordResetEmail,
  sendJobAlertEmail,
};