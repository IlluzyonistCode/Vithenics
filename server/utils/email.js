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
      path.join(__dirname, '../../vithenics-logo.png'),
      path.join(__dirname, '../vithenics-logo.png')
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

const getEmailTemplate = (title, greeting, message, buttonText, url, linkText, expiry, ignore, logoBase64, footer) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #333333; 
          background-color: #f5f5f5; 
          margin: 0; 
          padding: 0; 
        }
        .email-wrapper { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); 
          color: #ffffff; 
          padding: 40px 20px; 
          text-align: center; 
        }
        .header img { 
          max-width: 180px; 
          height: auto; 
          display: block; 
          margin: 0 auto 10px;
          background-color: transparent;
        }
        .header h1 { 
          font-size: 24px; 
          font-weight: 600; 
          margin: 0;
          color: #ffffff;
        }
        .content { 
          background-color: #ffffff; 
          padding: 40px 30px; 
        }
        .content h2 { 
          color: #1a1a1a; 
          font-size: 24px; 
          font-weight: 600; 
          margin-bottom: 20px; 
        }
        .content p { 
          color: #555555; 
          font-size: 16px; 
          margin-bottom: 20px; 
          line-height: 1.6;
        }
        .button-container { 
          text-align: center; 
          margin: 30px 0; 
        }
        .button { 
          display: inline-block; 
          padding: 14px 32px; 
          background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: 600;
          font-size: 16px;
          transition: opacity 0.3s;
        }
        .button:hover { 
          opacity: 0.9; 
        }
        .code { 
          font-size: 32px; 
          font-weight: bold; 
          text-align: center; 
          letter-spacing: 5px; 
          padding: 20px; 
          background-color: #ffffff; 
          border: 2px solid #1a1a1a; 
          margin: 20px 0;
          border-radius: 6px;
        }
        .link-text { 
          word-break: break-all; 
          color: #888888; 
          font-size: 13px; 
          margin-top: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 4px;
          border-left: 3px solid #1a1a1a;
        }
        .footer { 
          text-align: center; 
          padding: 30px 20px; 
          color: #888888; 
          font-size: 13px; 
          background-color: #f9f9f9;
          border-top: 1px solid #e0e0e0;
        }
        .footer p { 
          margin: 0; 
          color: #888888;
        }
        @media only screen and (max-width: 600px) {
          .content { padding: 30px 20px; }
          .header { padding: 30px 15px; }
          .header img { max-width: 150px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Vithenics Logo" style="max-width: 180px; height: auto;" />` : '<h1>Vithenics</h1>'}
        </div>
        <div class="content">
          <h2>${title}</h2>
          <p>${greeting}</p>
          <p>${message}</p>
          ${buttonText ? `
          <div class="button-container">
            <a href="${url}" class="button">${buttonText}</a>
          </div>
          ` : ''}
          ${url ? `<p class="link-text">${linkText}<br><strong>${url}</strong></p>` : ''}
          ${expiry ? `<p><strong>${expiry}</strong></p>` : ''}
          <p style="color: #888888; font-size: 14px;">${ignore}</p>
        </div>
        <div class="footer">
          <p>${footer}</p>
        </div>
      </div>
    </body>
    </html>
  `;
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
      html: getEmailTemplate(
        'Password Reset Request',
        'You requested to reset your password for your Vithenics account.',
        'Click the button below to reset your password:',
        'Reset Password',
        resetUrl,
        'Or copy and paste this link into your browser:',
        'This link will expire in 1 hour.',
        'If you didn\'t request this password reset, please ignore this email.',
        logoBase64,
        `© ${new Date().getFullYear()} Vithenics. All rights reserved.`
      )
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

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333333; 
            background-color: #f5f5f5; 
            margin: 0; 
            padding: 0; 
          }
          .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); 
            color: #ffffff; 
            padding: 40px 20px; 
            text-align: center; 
          }
          .header img { 
            max-width: 180px; 
            height: auto; 
            display: block; 
            margin: 0 auto 10px;
            background-color: transparent;
          }
          .header h1 { 
            font-size: 24px; 
            font-weight: 600; 
            margin: 0;
            color: #ffffff;
          }
          .content { 
            background-color: #ffffff; 
            padding: 40px 30px; 
          }
          .content h2 { 
            color: #1a1a1a; 
            font-size: 24px; 
            font-weight: 600; 
            margin-bottom: 20px; 
          }
          .content p { 
            color: #555555; 
            font-size: 16px; 
            margin-bottom: 20px; 
            line-height: 1.6;
          }
          .code { 
            font-size: 32px; 
            font-weight: bold; 
            text-align: center; 
            letter-spacing: 5px; 
            padding: 20px; 
            background-color: #ffffff; 
            border: 2px solid #1a1a1a; 
            margin: 20px 0;
            border-radius: 6px;
            color: #1a1a1a;
          }
          .footer { 
            text-align: center; 
            padding: 30px 20px; 
            color: #888888; 
            font-size: 13px; 
            background-color: #f9f9f9;
            border-top: 1px solid #e0e0e0;
          }
          .footer p { 
            margin: 0; 
            color: #888888;
          }
          @media only screen and (max-width: 600px) {
            .content { padding: 30px 20px; }
            .header { padding: 30px 15px; }
            .header img { max-width: 150px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Vithenics Logo" style="max-width: 180px; height: auto;" />` : '<h1>Vithenics</h1>'}
          </div>
          <div class="content">
            <h2>Email Verification Code</h2>
            <p>You requested to change your email address. Use the verification code below:</p>
            <div class="code">${code}</div>
            <p><strong>This code will expire in 10 minutes.</strong></p>
            <p style="color: #888888; font-size: 14px;">If you didn't request this email change, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Vithenics. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Vithenics" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Email Verification Code - Vithenics',
      html: htmlContent
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

