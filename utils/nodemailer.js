const nodemailer = require("nodemailer");
require("dotenv").config();
const path = require('path'); // keep this at the top

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// ✅ OTP email
const sendOTP = async (email, otp) => {
    try {
        const info = await transport.sendMail({
            from: `Afriverse Team <${process.env.MAIL_USER}>`,
            to: email,
            subject: "One Time Password",
            html: `<p style="line-height: 1.5">
        Your OTP verification code is: <br /><br />
        <font size="3px">${otp}</font> <br />
        Please note that this OTP will be valid for 5 minutes.
        Best regards,<br />
        The Afriverse Team.
        </p>`,
        });

        console.log("Email sent:", info.response);
    } catch (error) {
        console.error("Error sending email:", error);
        return { msg: "Error sending email", error };
    }
};

// ✅ Purchase success email
const sendSuccessMessage = async (email, name, groupLink) => {
    try {
        const info = await transport.sendMail({
            from: `Afriverse Team <${process.env.MAIL_USER}>`,
            to: email,
            subject: "You're In! Welcome to Afriverse 🎉",
            text: `Hi ${name || "dear"},\n\nThanks for completing your purchase. We’ll follow up shortly with access details.\n\n— Afriverse Team`,
            html: `
        <p>Hi ${name},</p>
        <p>Welcome to Afriverse! We’re excited to have you onboard.</p>
        <p>Your purchase was successful. Expect your access materials within the next 24 hours.</p>
        <p>If you have any questions, feel free to reply directly to this email.</p>
        <p>— The Afriverse Team</p>

        <p>To keep things seamless, we’re moving all paid users into one WhatsApp group. That way, you'll never miss an update, resource, or next step.</p>

        <p><strong>Tap here to join:</strong> <a href="${groupLink}">${groupLink}</a></p>

        <hr/>
        <p><strong>📘 Attached PDF:</strong> "Afriverse Done-For-You Guide"</p>
        <p>Please go through this guide before contacting support — it contains all setup steps and resource links.</p>
      `,
            attachments: [
                {
                    filename: "Afriverse-Done-For-You-Guide.pdf",
                    path: path.join(__dirname, "docs", "Afriverse-Done-For-You-Guide.pdf"),
                    contentType: "application/pdf",
                },
            ],
        });

        console.log("✅ Email sent:", info.response);
    } catch (error) {
        console.error("❌ Error sending email:", error);
        return { msg: "Error sending email", error };
    }
};

// ✅ WhatsApp invite
const sendWhatsappInvite = async (email, name, groupLink) => {
    try {
        const info = await transport.sendMail({
            from: `Afriverse Team <${process.env.MAIL_USER}>`,
            to: email,
            subject: "You're Invited: Join the Afriverse Portfolio Community on WhatsApp",
            html: `
             <p>Hey ${name || 'there'},</p>

<p>You’ve officially unlocked access to the Afriverse Portfolio Toolkit 🎉</p>
<p>To keep things seamless, we’re moving all paid users into one WhatsApp group. That way, you'll never miss an update, resource, or next step.</p>

<p><strong>Tap here to join:</strong> <a href="${groupLink}">${groupLink}</a></p>

<p>Welcome on board.<br />– Afriverse Team</p>`
        });

        console.log("WhatsApp invite sent:", info.response);
    } catch (error) {
        console.error("Error sending WhatsApp invite:", error);
        return { msg: "Error sending invite", error };
    }
};

// ✅ Portfolio email
const sendPortfolioEmail = async (email, name, portfolioLink, portfolioPdfPath) => {
    try {
        const info = await transport.sendMail({
            from: `Afriverse Team <${process.env.MAIL_USER}>`,
            to: email,
            subject: "Your Afriverse Portfolio & Editable Link",
            html: `
        <p>Hi ${name || 'there'},</p>
        <p>We’re excited to share your Afriverse portfolio with you.</p>
        <p>You can <strong>edit your portfolio here</strong> using Canva:</p>
        <p><a href="${portfolioLink}" target="_blank" rel="noopener noreferrer">${portfolioLink}</a></p>
        <p>Also, a PDF is attached to this email. This PDF contains important information to help you start your Web3 journey through the app.</p>
        <p>If you have any questions, feel free to reply to this email.</p>
        <p>Best regards,<br/>Afriverse Team</p>
      `,
            attachments: [{
                filename: path.basename(portfolioPdfPath),
                path: portfolioPdfPath,
                contentType: 'application/pdf',
            }],
        });

        console.log("Portfolio email sent:", info.response);
    } catch (error) {
        console.error("Error sending portfolio email:", error);
        return { msg: "Error sending portfolio email", error };
    }
};

// ✅ Academy thank-you email
const sendAcademyThankYou = async (email, name, courses = []) => {
    try {
        const courseList = courses.length
            ? `<ul>${courses.map(course => `<li>${course}</li>`).join('')}</ul>`
            : '<p>No specific courses selected.</p>';

        const info = await transport.sendMail({
            from: `Afriverse Academy <${process.env.MAIL_USER}>`,
            to: email,
            subject: "Welcome to Afriverse Academy 🎉",
            html: `
        <p>Hi ${name || 'there'},</p>
        
        <p>Thank you for registering with <strong>Afriverse Academy</strong>! 🚀</p>
        
        <p>You’ve shown interest in the following courses/skills:</p>
        ${courseList}

        <p>We’re excited to announce that our official academy launch is on <strong>5th January</strong>! 🗓️</p>
        
        <p>Next steps: our team will review your details and get in touch soon with more resources and onboarding information.</p>
        
        <p>If you have any questions, feel free to reply directly to this email.</p>
        
        <p>Best regards,<br/>Afriverse Academy Team</p>
      `,
        });

        console.log("Thank-you email sent:", info.response);
    } catch (error) {
        console.error("Error sending thank-you email:", error);
        return { msg: "Error sending thank-you email", error };
    }
};

module.exports = { sendOTP, sendAcademyThankYou, sendSuccessMessage, sendWhatsappInvite, sendPortfolioEmail };