// config/mailer.js - Email Configuration
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});
module.exports = {
  sendOTPEmail: async (email, otp) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'GreonXpert Authentication OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4a90e2;">GreonXpert Admin Authentication</h2>
            <p>Your One-Time Password (OTP) for authentication is:</p>
            <h1 style="color: #333; letter-spacing: 2px; font-size: 32px;">${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p>If you did not request this OTP, please ignore this email.</p>
            <p>Thank you,<br>GreonXpert Team</p>
          </div>
        `,
      };
      
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  },
};