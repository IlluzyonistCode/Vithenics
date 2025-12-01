const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'hisphere.ru',
    port: 587,
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  });
};

const getLogoBase64 = () => {
  try {
    const possiblePaths = [
      path.join(__dirname, '../../client/src/vithenics-logo.png'),
      path.join(__dirname, '../client/src/vithenics-logo.png'),
      path.join(__dirname, '../../vithenics-logo.png')
    ];
    
    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    }
    
    console.warn('Logo file not found in any of the expected paths');
    return null;
  } catch (error) {
    console.error('Error reading logo:', error);
    return null;
  }
};

const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    const logoBase64 = getLogoBase64();
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Vithenics" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - Vithenics',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #000; color: #fff; padding: 30px 20px; text-align: center; }
            .header img { max-width: 200px; height: auto; margin-bottom: 10px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Vithenics Logo" />` : '<h1>Vithenics</h1>'}
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>You requested to reset your password for your Vithenics account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Vithenics. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

const sendEmailVerificationCode = async (email, code) => {
  try {
    const transporter = createTransporter();
    const logoBase64 = getLogoBase64();

    const mailOptions = {
      from: `"Vithenics" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Email Verification Code - Vithenics',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #000; color: #fff; padding: 30px 20px; text-align: center; }
            .header img { max-width: 200px; height: auto; margin-bottom: 10px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; padding: 20px; background-color: #fff; border: 2px solid #000; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Vithenics Logo" />` : '<h1>Vithenics</h1>'}
            </div>
            <div class="content">
              <h2>Email Verification Code</h2>
              <p>You requested to change your email address. Use the verification code below:</p>
              <div class="code">${code}</div>
              <p><strong>This code will expire in 10 minutes.</strong></p>
              <p>If you didn't request this email change, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Vithenics. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email verification code:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendEmailVerificationCode
};

