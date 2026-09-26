import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create transporter configuration based on email service
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || "gmail";

  let transportConfig;

  if (emailService === "gmail") {
    // Gmail configuration
    transportConfig = {
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Additional Gmail-specific settings
      tls: {
        rejectUnauthorized: false, // For development, set to true in production
        ciphers: "SSLv3",
      },
      pool: true, // Use connection pool
      maxConnections: 5,
      maxMessages: 10,
      rateDelta: 1000,
      rateLimit: 5,
    };
  } else {
    // Custom SMTP configuration
    transportConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // For development
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
    };
  }

  console.log("📧 Email Configuration:", {
    service: emailService,
    user: process.env.EMAIL_USER,
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
  });

  return nodemailer.createTransport(transportConfig);
};

// Create persistent transporter
const transporter = createTransporter();

// Verify transporter configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter verification failed:", error.message);
    console.error("Please check your email configuration in .env file");
    console.error("For Gmail, make sure you are using an App Password");
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// Email templates
const getPasswordResetEmailHTML = (resetLink, userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2A166D 0%, #3a1c9a 100%);
          color: #ffffff;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #2A166D;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #3a1c9a;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2A166D;">${resetLink}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul style="margin: 10px 0;">
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>Your password won't change until you access the link above</li>
            </ul>
          </div>
          <p>If you have any questions or concerns, please contact our support team.</p>
          <p>Best regards,<br><strong>Waqar-e-Makkah Travel  Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Waqar-e-Makkah Travel . All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email,
  resetToken,
  userId,
  userName,
) => {
  try {
    console.log(`📤 Attempting to send password reset email to: ${email}`);

    // Construct reset link
    const frontendURL = "https://waqaremakkah.com";
    const resetLink = `${frontendURL}/auth/forgot-password?token=${resetToken}&userId=${userId}`;

    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel ",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Password Reset Request - Waqar-e-Makkah Travel ",
      html: getPasswordResetEmailHTML(resetLink, userName),
      text: `Hello ${userName},\n\nWe received a request to reset your password.\n\nPlease click the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nWaqar-e-Makkah Travel  Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending password reset email:", error.message);
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Email template for sending credentials
const getCredentialsEmailHTML = (
  agentCode,
  email,
  password,
  userName,
  companyName,
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Agent Credentials</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2A166D 0%, #3a1c9a 100%);
          color: #ffffff;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
        }
        .credentials-box {
          background-color: #f8f9fa;
          border: 2px solid #2A166D;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 15px 0;
          padding: 10px;
          background-color: #ffffff;
          border-radius: 4px;
        }
        .credential-label {
          font-weight: bold;
          color: #2A166D;
          font-size: 14px;
        }
        .credential-value {
          font-size: 16px;
          color: #333;
          font-family: 'Courier New', monospace;
          margin-top: 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #2A166D;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: bold;
        }
        .button:hover {
          background-color: #3a1c9a;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Waqar-e-Makkah Travel !</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Welcome to Waqar-e-Makkah Travel ! Your agency account has been created successfully.</p>
          <p><strong>Company:</strong> ${companyName}</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #2A166D;">Your Login Credentials</h3>
            
            <div class="credential-item">
              <div class="credential-label">Agent Code:</div>
              <div class="credential-value">${agentCode}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${email}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Password:</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${"https://waqaremakkah.com"}" class="button">Login to Your Account</a>
          </div>

          <div class="warning">
            <strong>🔒 Security Tips:</strong>
            <ul style="margin: 10px 0;">
              <li>Keep your credentials safe and secure</li>
              <li>Do not share your password with anyone</li>
              <li>We recommend changing your password after first login</li>
              <li>If you didn't request this account, please contact us immediately</li>
            </ul>
          </div>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br><strong>Waqar-e-Makkah Travel  Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Waqar-e-Makkah Travel . All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send credentials email to agent
export const sendCredentialsEmail = async (
  email,
  agentCode,
  password,
  userName,
  companyName,
) => {
  try {
    console.log(`📤 Attempting to send credentials email to: ${email}`);
    console.log(
      `Agent: ${userName}, Code: ${agentCode}, Company: ${companyName}`,
    );

    // Validate inputs
    if (!email || !agentCode || !password || !userName) {
      throw new Error(
        "Missing required parameters: email, agentCode, password, or userName",
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel ",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Your Agent Credentials - Waqar-e-Makkah Travel ",
      html: getCredentialsEmailHTML(
        agentCode,
        email,
        password,
        userName,
        companyName,
      ),
      text: `Hello ${userName},\n\nWelcome to Waqar-e-Makkah Travel ! Your agency account has been created successfully.\n\nCompany: ${companyName}\n\nYour Login Credentials:\nAgent Code: ${agentCode}\nEmail: ${email}\nPassword: ${password}\n\nLogin URL: ${"https://waqaremakkah.com"}\n\nSecurity Tips:\n- Keep your credentials safe and secure\n- Do not share your password with anyone\n- We recommend changing your password after first login\n\nBest regards,\nWaqar-e-Makkah Travel `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Credentials email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    if (info.rejected && info.rejected.length > 0) {
      throw new Error(
        `Email was rejected by the server for: ${info.rejected.join(", ")}`,
      );
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending credentials email:", error.message);
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error(`Failed to send credentials email: ${error.message}`);
  }
};

const getAdminCredentialsLoginUrl = () => {
  return `${"https://waqaremakkah.com/admin-portal/".replace(/\/$/, "")}/signin`;

  const frontendUrl = "https://waqaremakkah.com".replace(/\/$/, "");
  return `${frontendUrl}/admin-portal/signin`;
};

const getAdminCredentialsEmailHTML = (
  email,
  password,
  userName,
  companyName,
) => {
  const loginUrl = getAdminCredentialsLoginUrl();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Admin Portal Credentials</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #2A166D 0%, #3a1c9a 100%);
          color: #ffffff;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px 20px;
        }
        .credentials-box {
          background-color: #f8f9fa;
          border: 2px solid #2A166D;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .credential-item {
          margin: 15px 0;
          padding: 10px;
          background-color: #ffffff;
          border-radius: 4px;
        }
        .credential-label {
          font-weight: bold;
          color: #2A166D;
          font-size: 14px;
        }
        .credential-value {
          font-size: 16px;
          color: #333;
          font-family: 'Courier New', monospace;
          margin-top: 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #2A166D;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 25px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Waqar-e-Makkah Travel</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your admin portal sub-user account credentials are ready.</p>

          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #2A166D;">Your Login Credentials</h3>

            <div class="credential-item">
              <div class="credential-label">Email:</div>
              <div class="credential-value">${email}</div>
            </div>

            <div class="credential-item">
              <div class="credential-label">Password:</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Login to Admin Portal</a>
          </div>

          <div class="warning">
            <strong>Security Tips:</strong>
            <ul style="margin: 10px 0;">
              <li>Keep your credentials safe and secure</li>
              <li>Do not share your password with anyone</li>
              <li>We recommend changing your password after first login</li>
            </ul>
          </div>

          <p>Best regards,<br><strong>Waqar-e-Makkah Travel Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Waqar-e-Makkah Travel. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendAdminCredentialsEmail = async (
  email,
  password,
  userName,
  companyName,
) => {
  try {
    console.log(`Attempting to send admin credentials email to: ${email}`);

    if (!email || !password || !userName) {
      throw new Error(
        "Missing required parameters: email, password, or userName",
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    const loginUrl = getAdminCredentialsLoginUrl();
    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel ",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Your Admin Portal Credentials - Waqar-e-Makkah Travel",
      html: getAdminCredentialsEmailHTML(
        email,
        password,
        userName,
        companyName,
      ),
      text: `Hello ${userName},\n\nYour admin portal sub-user account credentials are ready.\n\nCompany: ${companyName}\n\nYour Login Credentials:\nEmail: ${email}\nPassword: ${password}\n\nLogin URL: ${loginUrl}\n\nSecurity Tips:\n- Keep your credentials safe and secure\n- Do not share your password with anyone\n- We recommend changing your password after first login\n\nBest regards,\nWaqar-e-Makkah Travel`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Admin credentials email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);

    if (info.rejected && info.rejected.length > 0) {
      throw new Error(
        `Email was rejected by the server for: ${info.rejected.join(", ")}`,
      );
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin credentials email:", error.message);
    console.error("Error details:", {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw new Error(`Failed to send admin credentials email: ${error.message}`);
  }
};

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email configuration is valid");
    return { success: true, message: "Email configuration is valid" };
  } catch (error) {
    console.error("❌ Email configuration error:", error);
    return { success: false, error: error.message };
  }
};

export const getAgentRegistrationEmailHTML = (name = "Agent") => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Registration Received</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            
            <tr>
              <td style="background:#012A36; padding:25px; text-align:center;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                  Waqar-e-Makkah Travel
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:35px 30px; color:#333333;">
                <h2 style="margin-top:0; color:#012A36;">
                  Agent Registration Received
                </h2>

                <p style="font-size:16px; line-height:1.6;">
                  Hello <strong>${name}</strong>,
                </p>

                <p style="font-size:16px; line-height:1.6;">
                  Thank you for registering as an agent with Waqar-e-Makkah Travel.
                </p>

                <p style="font-size:16px; line-height:1.6;">
                  Your account has been created successfully, but it is currently waiting for admin approval.
                </p>

                <div style="background:#fff4e5; border-left:4px solid #ff9800; padding:15px; margin:25px 0;">
                  <p style="margin:0; font-size:15px; line-height:1.6; color:#6b4600;">
                    Please wait for the admin to activate your account. Once your account is activated, you will be able to log in and use your agent portal.
                  </p>
                </div>

                <p style="font-size:16px; line-height:1.6; margin-bottom:0;">
                  Best regards,<br />
                  <strong>Waqar-e-Makkah Travel Team</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f1f1f1; padding:15px; text-align:center; color:#777777; font-size:13px;">
                © ${new Date().getFullYear()} Waqar-e-Makkah Travel. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};
export const sendAgentRegistrationEmail = async (email, name = "Agent") => {
  try {
    console.log(`📤 Attempting to send agent registration email to: ${email}`);

    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Agent Registration Received - Waiting for Admin Approval",
      html: getAgentRegistrationEmailHTML(name),
      text: `Hello ${name},

Thank you for registering as an agent with Waqar-e-Makkah Travel.

Your account has been created successfully, but it is currently waiting for admin approval.

Please wait for the admin to activate your account. Once your account is activated, you will be able to log in and use your agent portal.

Best regards,
Waqar-e-Makkah Travel Team`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Agent registration email sent successfully!");
    console.log("Message ID:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending agent registration email:", error.message);

    throw new Error(
      `Failed to send agent registration email: ${error.message}`,
    );
  }
};

const escapeHtml = (value = "") => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const getBookingStatusUpdateEmailHTML = ({
  name = "Customer",
  bookingReference = "N/A",
  oldStatus = "N/A",
  newStatus = "N/A",
  notes = "",
}) => {
  const statusMessages = {
    confirmed:
      "Your booking has been confirmed successfully. Please keep your booking reference safe.",
    cancelled:
      "Your booking has been cancelled. Please contact our support team if you need more information.",
    "on hold":
      "Your booking is currently on hold. Please complete the required process before the hold time expires.",
    pending:
      "Your booking status is currently pending. We will update you once it is processed.",
  };

  const message =
    statusMessages[String(newStatus).toLowerCase()] ||
    `Your booking status has been updated to ${newStatus}.`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Booking Status Updated</title>
  </head>

  <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            
            <tr>
              <td style="background:#012A36; padding:25px; text-align:center;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                  Waqar-e-Makkah Travel
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:35px 30px; color:#333333;">
                <h2 style="margin-top:0; color:#012A36;">
                  Booking Status Updated
                </h2>

                <p style="font-size:16px; line-height:1.6;">
                  Hello Agent</strong>,
                </p>

                <p style="font-size:16px; line-height:1.6;">
                  ${escapeHtml(message)}
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; border-collapse:collapse;">
                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Booking Reference
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${escapeHtml(bookingReference)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Previous Status
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${escapeHtml(oldStatus)}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      New Status
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      <strong>${escapeHtml(newStatus)}</strong>
                    </td>
                  </tr>
                </table>

                ${
                  notes
                    ? `
                    <div style="background:#eef7fb; border-left:4px solid #012A36; padding:15px; margin:25px 0;">
                      <p style="margin:0; font-size:15px; line-height:1.6; color:#333333;">
                        <strong>Notes:</strong> ${escapeHtml(notes)}
                      </p>
                    </div>
                    `
                    : ""
                }

                <p style="font-size:16px; line-height:1.6; margin-bottom:0;">
                  Best regards,<br />
                  <strong>Waqar-e-Makkah Travel Team</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f1f1f1; padding:15px; text-align:center; color:#777777; font-size:13px;">
                © ${new Date().getFullYear()} Waqar-e-Makkah Travel. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export const sendBookingStatusUpdateEmail = async ({
  email,
  name,
  bookingReference,
  oldStatus,
  newStatus,
  notes,
}) => {
  try {
    console.log(`📤 Sending booking status update email to: ${email}`);

    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: `Booking Status Updated - ${bookingReference}`,
      html: getBookingStatusUpdateEmailHTML({
        name,
        bookingReference,
        oldStatus,
        newStatus,
        notes,
      }),
      text: `Hello Agent,

Your booking status has been updated.

Booking Reference: ${bookingReference}
Previous Status: ${oldStatus}
New Status: ${newStatus}
${notes ? `Notes: ${notes}` : ""}

Best regards,
Waqar-e-Makkah Travel Team`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Booking status update email sent successfully!");
    console.log("Message ID:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(
      "❌ Error sending booking status update email:",
      error.message,
    );

    throw new Error(
      `Failed to send booking status update email: ${error.message}`,
    );
  }
};

export const getAgentStatusUpdateEmailHTML = ({
  name = "Agent",
  status = "Pending",
  agencyCode = "N/A",
  companyName = "N/A",
}) => {
  const statusConfig = {
    Active: {
      title: "Your Agent Account Has Been Activated",
      message:
        "Good news! Your agent account has been activated by the admin. You can now log in and use your agent portal.",
      boxBg: "#e8f5e9",
      border: "#4caf50",
      color: "#1b5e20",
    },
    Inactive: {
      title: "Your Agent Account Is Inactive",
      message:
        "Your agent account is currently inactive. Please contact the admin or support team for more information.",
      boxBg: "#ffebee",
      border: "#f44336",
      color: "#b71c1c",
    },
    Pending: {
      title: "Your Agent Account Is Pending Approval",
      message:
        "Your agent account is currently pending admin approval. Please wait for the admin to activate your account.",
      boxBg: "#fff4e5",
      border: "#ff9800",
      color: "#6b4600",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.Pending;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${currentStatus.title}</title>
  </head>

  <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            
            <tr>
              <td style="background:#012A36; padding:25px; text-align:center;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                  Waqar-e-Makkah Travel
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:35px 30px; color:#333333;">
                <h2 style="margin-top:0; color:#012A36;">
                  ${currentStatus.title}
                </h2>

                <p style="font-size:16px; line-height:1.6;">
                  Hello <strong>${name}</strong>,
                </p>

                <div style="background:${currentStatus.boxBg}; border-left:4px solid ${currentStatus.border}; padding:15px; margin:25px 0;">
                  <p style="margin:0; font-size:15px; line-height:1.6; color:${currentStatus.color};">
                    ${currentStatus.message}
                  </p>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; border-collapse:collapse;">
                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Account Status
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      <strong>${status}</strong>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Agency Code
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${agencyCode}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Company Name
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${companyName}
                    </td>
                  </tr>
                </table>

                ${
                  status === "Active"
                    ? `
                    <p style="font-size:16px; line-height:1.6;">
                      You may now log in to your account using your registered email and credentials.
                    </p>
                    `
                    : ""
                }

                <p style="font-size:16px; line-height:1.6; margin-bottom:0;">
                  Best regards,<br />
                  <strong>Waqar-e-Makkah Travel Team</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f1f1f1; padding:15px; text-align:center; color:#777777; font-size:13px;">
                © ${new Date().getFullYear()} Waqar-e-Makkah Travel. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export const sendAgentStatusUpdateEmail = async ({
  email,
  name,
  status,
  agencyCode,
  companyName,
}) => {
  try {
    console.log(`📤 Sending agent status update email to: ${email}`);

    const subjectMap = {
      Active: "Your Agent Account Has Been Activated",
      Inactive: "Your Agent Account Is Inactive",
      Pending: "Your Agent Account Is Pending Approval",
    };

    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: subjectMap[status] || "Agent Account Status Updated",
      html: getAgentStatusUpdateEmailHTML({
        name,
        status,
        agencyCode,
        companyName,
      }),
      text: `Hello ${name || "Agent"},

Your agent account status has been updated.

Status: ${status}
Agency Code: ${agencyCode || "N/A"}
Company Name: ${companyName || "N/A"}

${
  status === "Active"
    ? "Your account has been activated by the admin. You can now log in and use your agent portal."
    : status === "Inactive"
      ? "Your account is currently inactive. Please contact admin or support."
      : "Your account is currently pending admin approval."
}

Best regards,
Waqar-e-Makkah Travel Team`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Agent status update email sent successfully!");
    console.log("Message ID:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending agent status update email:", error.message);

    throw new Error(
      `Failed to send agent status update email: ${error.message}`,
    );
  }
};

export const getAdminAgencyRegistrationEmailHTML = ({
  name = "N/A",
  email = "N/A",
  phone = "N/A",
  companyName = "N/A",
  address = "N/A",
  city = "N/A",
  agencyCode = "N/A",
  status = "Pending",
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Agency Registration</title>
  </head>

  <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb; padding:30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            
            <tr>
              <td style="background:#012A36; padding:25px; text-align:center;">
                <h1 style="color:#ffffff; margin:0; font-size:24px;">
                  Waqar-e-Makkah Travel
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:35px 30px; color:#333333;">
                <h2 style="margin-top:0; color:#012A36;">
                  New Agency Registration
                </h2>

                <p style="font-size:16px; line-height:1.6;">
                  A new agency has registered and is waiting for admin approval.
                </p>

                <div style="background:#fff4e5; border-left:4px solid #ff9800; padding:15px; margin:25px 0;">
                  <p style="margin:0; font-size:15px; line-height:1.6; color:#6b4600;">
                    Please review this agency account and update the status if approved.
                  </p>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; border-collapse:collapse;">
                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Name
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${name}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Email
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${email}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Phone
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${phone}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Company Name
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${companyName}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      City
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${city}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Address
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${address}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Agency Code
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      ${agencyCode}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:12px; border:1px solid #e5e5e5; background:#f9f9f9; font-weight:bold;">
                      Status
                    </td>
                    <td style="padding:12px; border:1px solid #e5e5e5;">
                      <strong>${status}</strong>
                    </td>
                  </tr>
                </table>

                <p style="font-size:16px; line-height:1.6; margin-bottom:0;">
                  Best regards,<br />
                  <strong>Waqar-e-Makkah Travel System</strong>
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f1f1f1; padding:15px; text-align:center; color:#777777; font-size:13px;">
                © ${new Date().getFullYear()} Waqar-e-Makkah Travel. All rights reserved.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export const sendAdminAgencyRegistrationEmail = async ({
  name,
  email,
  phone,
  companyName,
  address,
  city,
  agencyCode,
  status,
}) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.log("⚠️ ADMIN_EMAIL is missing in env");
      return {
        success: false,
        message: "ADMIN_EMAIL is missing",
      };
    }

    console.log(
      `📤 Sending new agency registration email to admin: ${adminEmail}`,
    );

    const mailOptions = {
      from: {
        name: "Waqar-e-Makkah Travel",
        address: process.env.EMAIL_USER,
      },
      to: adminEmail,
      subject: `New Agency Registration - ${companyName || name}`,
      html: getAdminAgencyRegistrationEmailHTML({
        name,
        email,
        phone,
        companyName,
        address,
        city,
        agencyCode,
        status,
      }),
      text: `New agency registration received.

Name: ${name || "N/A"}
Email: ${email || "N/A"}
Phone: ${phone || "N/A"}
Company Name: ${companyName || "N/A"}
City: ${city || "N/A"}
Address: ${address || "N/A"}
Agency Code: ${agencyCode || "N/A"}
Status: ${status || "Pending"}

Please review this agency account and activate it if approved.

Best regards,
Waqar-e-Makkah Travel System`,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Admin agency registration email sent successfully!");
    console.log("Message ID:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(
      "❌ Error sending admin agency registration email:",
      error.message,
    );

    throw new Error(
      `Failed to send admin agency registration email: ${error.message}`,
    );
  }
};

export default {
  sendPasswordResetEmail,
  sendCredentialsEmail,
  sendAdminCredentialsEmail,
  testEmailConfiguration,
  getAgentRegistrationEmailHTML,
  sendAgentRegistrationEmail,
  getBookingStatusUpdateEmailHTML,
  sendBookingStatusUpdateEmail,
};
