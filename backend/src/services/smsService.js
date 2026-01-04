const axios = require('axios');
const { SMS_TEMPLATES } = require('../config/constants');

// SMS Service using a generic SMS API
// You can replace this with your preferred SMS provider (e.g., Twilio, Bangladesh SMS Gateway)

const sendSMS = async (phone, message) => {
  try {
    // Check if SMS is configured
    if (!process.env.SMS_API_KEY || !process.env.SMS_API_URL) {
      console.log('SMS not configured. Message would have been sent to:', phone);
      console.log('Message:', message);
      return { success: true, message: 'SMS not configured (development mode)' };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone);

    // Send SMS using API
    const response = await axios.post(process.env.SMS_API_URL, {
      api_key: process.env.SMS_API_KEY,
      phone: formattedPhone,
      message: message,
    });

    console.log('SMS sent successfully to:', formattedPhone);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return { success: false, error: error.message };
  }
};

// Format phone number to Bangladesh standard
const formatPhoneNumber = (phone) => {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (!cleaned.startsWith('880') && cleaned.startsWith('0')) {
    cleaned = '880' + cleaned.slice(1);
  } else if (!cleaned.startsWith('880')) {
    cleaned = '880' + cleaned;
  }
  
  return cleaned;
};

// Send OTP via SMS
const sendOTP = async (phone, otp) => {
  const message = `Your WorkerCall verification code is: ${otp}. Valid for 10 minutes.`;
  return await sendSMS(phone, message);
};

// Send booking notification to worker
const sendBookingNotification = async (phone, bookingDetails) => {
  const message = `New booking request! Customer: ${bookingDetails.customerName}. Service: ${bookingDetails.service}. Location: ${bookingDetails.location}. Login to accept or reject.`;
  return await sendSMS(phone, message);
};

// Send booking confirmation to user
const sendBookingConfirmation = async (phone, bookingDetails) => {
  const message = `Booking confirmed! Worker: ${bookingDetails.workerName}. ${bookingDetails.type === 'instant' ? 'Worker will arrive soon' : `Scheduled for ${bookingDetails.date} at ${bookingDetails.time}`}. Booking #${bookingDetails.bookingNumber}`;
  return await sendSMS(phone, message);
};

// Send booking accepted notification
const sendBookingAccepted = async (phone, workerName, bookingNumber) => {
  const message = `Great news! ${workerName} has accepted your booking request #${bookingNumber}. They will contact you shortly.`;
  return await sendSMS(phone, message);
};

// Send job started notification
const sendJobStarted = async (phone, workerName, bookingNumber) => {
  const message = `${workerName} has started working on your job #${bookingNumber}.`;
  return await sendSMS(phone, message);
};

// Send job completed notification
const sendJobCompleted = async (phone, bookingNumber, finalPrice) => {
  const message = `Your job #${bookingNumber} has been completed. Total amount: ৳${finalPrice}. Please rate your experience.`;
  return await sendSMS(phone, message);
};

// Send booking reminder (for scheduled bookings)
const sendBookingReminder = async (phone, bookingDetails) => {
  const message = `Reminder: Your booking with ${bookingDetails.workerName} is scheduled for today at ${bookingDetails.time}. Booking #${bookingDetails.bookingNumber}`;
  return await sendSMS(phone, message);
};

// Send payment confirmation
const sendPaymentConfirmation = async (phone, amount, bookingNumber) => {
  const message = `Payment received! Amount: ৳${amount}. Booking #${bookingNumber}. Thank you for using WorkerCall!`;
  return await sendSMS(phone, message);
};

// Send welcome SMS to new users
const sendWelcomeSMS = async (phone, name) => {
  const message = `Welcome to WorkerCall, ${name}! Find verified workers or start earning as a professional worker. Download our app to get started.`;
  return await sendSMS(phone, message);
};

// Send verification approved SMS
const sendVerificationApprovedSMS = async (phone, name) => {
  const message = `Congratulations ${name}! Your profile has been verified. You can now start accepting booking requests and earning money.`;
  return await sendSMS(phone, message);
};

module.exports = {
  sendSMS,
  sendOTP,
  sendBookingNotification,
  sendBookingConfirmation,
  sendBookingAccepted,
  sendJobStarted,
  sendJobCompleted,
  sendBookingReminder,
  sendPaymentConfirmation,
  sendWelcomeSMS,
  sendVerificationApprovedSMS,
  formatPhoneNumber,
};