// utils/emailService.js - Complete Enhanced Version

const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Send confirmation email to user when they submit a contact form
  async sendUserConfirmationEmail(contactForm) {
    try {
      const mailOptions = {
        from: `"GreonXpert Team" <${process.env.SMTP_USER}>`,
        to: contactForm.email,
        subject: `Thank you for contacting GreonXpert - ${contactForm.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1AC99F, #0E9A78); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .highlight { background: #1AC99F; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                .contact-details { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🌱 GreonXpert</h1>
                  <h2>Thank You for Your Inquiry!</h2>
                </div>
                <div class="content">
                  <p>Dear ${contactForm.name},</p>
                  
                  <p>Thank you for reaching out to GreonXpert! We have successfully received your inquiry and our team is excited to help you with your sustainability journey.</p>
                  
                  <div class="highlight">
                    <strong>📋 Your Inquiry Details:</strong>
                  </div>
                  
                  <div class="contact-details">
                    <p><strong>Subject:</strong> ${contactForm.subject}</p>
                    <p><strong>Inquiry Type:</strong> ${contactForm.inquiryType.charAt(0).toUpperCase() + contactForm.inquiryType.slice(1)}</p>
                    <p><strong>Priority:</strong> ${contactForm.priority.charAt(0).toUpperCase() + contactForm.priority.slice(1)}</p>
                    <p><strong>Submitted:</strong> ${new Date(contactForm.createdAt).toLocaleDateString()}</p>
                    ${contactForm.company ? `<p><strong>Company:</strong> ${contactForm.company}</p>` : ''}
                    ${contactForm.phone ? `<p><strong>Phone:</strong> ${contactForm.phone}</p>` : ''}
                  </div>
                  
                  <p><strong>Your Message:</strong></p>
                  <div style="background: white; padding: 15px; border-left: 4px solid #1AC99F; margin: 15px 0;">
                    ${contactForm.message.replace(/\n/g, '<br>')}
                  </div>
                  
                  <div class="highlight">
                    <strong>⏰ What's Next?</strong>
                    <p style="margin-top: 10px;">Our expert team will review your inquiry and get back to you within 24-48 hours. For urgent matters, feel free to call us at +91 77365 38040.</p>
                  </div>
                  
                  <p>In the meantime, you can:</p>
                  <ul>
                    <li>🌐 Explore our website for more sustainability solutions</li>
                    <li>📱 Follow us on social media for the latest updates</li>
                    <li>📧 Contact us at info@greonXpert.com for any immediate questions</li>
                  </ul>
                  
                  <p>We appreciate your interest in sustainable solutions and look forward to helping you achieve your environmental goals!</p>
                  
                  <p>Best regards,<br>
                  <strong>The GreonXpert Team</strong></p>
                </div>
                <div class="footer">
                  <p>GreonXpert Pvt Ltd. | Kalamassery, Ernakulam, Kerala, India</p>
                  <p>📞 +91 77365 38040 | 📧 info@greonXpert.com</p>
                  <p style="font-size: 12px; color: #999;">This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Confirmation email sent to user: ${contactForm.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send user confirmation email:', error);
      return false;
    }
  }

  // Send notification to admins when a new contact form is submitted  
  async sendContactFormNotification(contactForm) {
    try {
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['fazil@greonxpert.com','Adhil@greonxpert.com'];
      
      const mailOptions = {
        from: `"GreonXpert System" <${process.env.SMTP_USER}>`,
        to: adminEmails.join(','),
        subject: `🚨 New Contact Form Submission - ${contactForm.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #FF6B6B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                .priority-high { background: #FFE5E5; border-left: 4px solid #FF6B6B; padding: 15px; }
                .priority-medium { background: #FFF3CD; border-left: 4px solid #FFC107; padding: 15px; }
                .priority-low { background: #E8F5E8; border-left: 4px solid #28A745; padding: 15px; }
                .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .action-required { background: #1AC99F; color: white; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚨 NEW CONTACT FORM</h1>
                  <p>Immediate attention required</p>
                </div>
                <div class="content">
                  <div class="priority-${contactForm.priority}">
                    <strong>Priority: ${contactForm.priority.toUpperCase()} 🔥</strong>
                  </div>
                  
                  <div class="details">
                    <h3>📋 Contact Details:</h3>
                    <p><strong>Name:</strong> ${contactForm.name}</p>
                    <p><strong>Email:</strong> ${contactForm.email}</p>
                    <p><strong>Phone:</strong> ${contactForm.phone || 'Not provided'}</p>
                    <p><strong>Company:</strong> ${contactForm.company || 'Not provided'}</p>
                    <p><strong>Designation:</strong> ${contactForm.designation || 'Not provided'}</p>
                    <p><strong>Subject:</strong> ${contactForm.subject}</p>
                    <p><strong>Inquiry Type:</strong> ${contactForm.inquiryType.replace('_', ' ').toUpperCase()}</p>
                    <p><strong>Submitted:</strong> ${new Date(contactForm.createdAt).toLocaleString()}</p>
                  </div>
                  
                  <div class="details">
                    <h3>💬 Message:</h3>
                    <p style="background: #f0f0f0; padding: 10px; border-radius: 3px;">${contactForm.message.replace(/\n/g, '<br>')}</p>
                  </div>
                  
                  <div class="action-required">
                    <strong>⚡ ACTION REQUIRED</strong>
                    <p>Please review and respond to this inquiry promptly through the admin panel.</p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/contact-forms" 
                       style="background: #1AC99F; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                      📊 View in Admin Panel
                    </a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin notification sent for contact form: ${contactForm._id}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return false;
    }
  }

  // Enhanced status update notification to user
  async sendEnhancedStatusUpdateEmail(contactForm, oldStatus, newStatus, updatedBy, reason) {
    try {
      const statusMessages = {
        'open': '📋 We have received your inquiry and it is being reviewed by our team.',
        'in_progress': '⚡ Great news! We are actively working on your inquiry and will have updates soon.',
        'closed': '✅ Your inquiry has been completed successfully. Thank you for choosing GreonXpert!',
        'deal_signed': '🎉 Congratulations! We are excited to work with you and help achieve your sustainability goals.',
        'rejected': '😔 Thank you for your interest. Unfortunately, this inquiry does not align with our current offerings.',
        'not_applicable': '📝 Your inquiry has been reviewed and categorized accordingly.'
      };

      const statusIcons = {
        'open': '🔓',
        'in_progress': '⚡',
        'closed': '✅',
        'deal_signed': '🎉',
        'rejected': '❌',
        'not_applicable': '🚫'
      };

      const mailOptions = {
        from: `"GreonXpert Team" <${process.env.SMTP_USER}>`,
        to: contactForm.email,
        subject: `${statusIcons[newStatus]} Update on Your Inquiry: ${contactForm.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1AC99F, #0E9A78); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .status-update { background: #1AC99F; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
                .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                .status-comparison { display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
                .status-box { padding: 15px; border-radius: 5px; text-align: center; flex: 1; margin: 0 10px; }
                .old-status { background: #ffebee; color: #c62828; }
                .new-status { background: #e8f5e8; color: #2e7d32; }
                .arrow { font-size: 24px; color: #1AC99F; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📬 Inquiry Status Update</h1>
                  <p>Your inquiry status has been updated</p>
                </div>
                <div class="content">
                  <p>Dear ${contactForm.name},</p>
                  
                  <p>We wanted to update you on the status of your inquiry with GreonXpert.</p>
                  
                  <div class="status-update">
                    <h2>${statusIcons[newStatus]} Status Update</h2>
                    <div class="status-comparison">
                      <div class="status-box old-status">
                        <strong>Previous Status</strong><br>
                        ${oldStatus.replace('_', ' ').toUpperCase()}
                      </div>
                      <div class="arrow">➜</div>
                      <div class="status-box new-status">
                        <strong>Current Status</strong><br>
                        ${newStatus.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <p style="margin-top: 15px; font-size: 16px;">${statusMessages[newStatus] || 'Your inquiry status has been updated.'}</p>
                  </div>
                  
                  <div class="details">
                    <h3>📋 Your Inquiry Details:</h3>
                    <p><strong>Subject:</strong> ${contactForm.subject}</p>
                    <p><strong>Submitted:</strong> ${new Date(contactForm.createdAt).toLocaleDateString()}</p>
                    <p><strong>Updated by:</strong> ${updatedBy?.name || 'GreonXpert Team'}</p>
                    <p><strong>Updated on:</strong> ${new Date().toLocaleDateString()}</p>
                    ${reason ? `<p><strong>Update Reason:</strong> ${reason}</p>` : ''}
                  </div>
                  
                  ${contactForm.notes ? `
                    <div class="details">
                      <h3>📝 Additional Notes:</h3>
                      <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #1AC99F;">${contactForm.notes.replace(/\n/g, '<br>')}</p>
                    </div>
                  ` : ''}
                  
                  <div class="details">
                    <h3>📞 Need Assistance?</h3>
                    <p>If you have any questions about this update or need further assistance, please don't hesitate to contact us:</p>
                    <ul>
                      <li>📧 Email: info@greonXpert.com</li>
                      <li>📞 Phone: +91 77365 38040</li>
                      <li>💬 Reply to this email directly</li>
                    </ul>
                  </div>
                  
                  <p>Thank you for choosing GreonXpert for your sustainability journey!</p>
                  
                  <p>Best regards,<br>
                  <strong>The GreonXpert Team</strong></p>
                </div>
                <div class="footer">
                  <p>GreonXpert Pvt Ltd. | Kalamassery, Ernakulam, Kerala, India</p>
                  <p>📞 +91 77365 38040 | 📧 info@greonXpert.com</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Enhanced status update email sent to user: ${contactForm.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send enhanced status update email:', error);
      return false;
    }
  }

  // Enhanced response email to user
  async sendEnhancedResponseEmail(contactForm, response, respondedBy, emailSubject, isUrgent) {
    try {
      const urgentFlag = isUrgent ? '🚨 URGENT - ' : '';
      const finalSubject = emailSubject || `Response to Your Inquiry: ${contactForm.subject}`;
      
      const mailOptions = {
        from: `"${respondedBy?.name || 'GreonXpert Team'}" <${process.env.SMTP_USER}>`,
        to: contactForm.email,
        subject: `${urgentFlag}${finalSubject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { 
                  background: ${isUrgent ? 'linear-gradient(135deg, #FF6B6B, #FF5252)' : 'linear-gradient(135deg, #1AC99F, #0E9A78)'}; 
                  color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; 
                }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .response { 
                  background: white; 
                  padding: 25px; 
                  border-left: 4px solid ${isUrgent ? '#FF6B6B' : '#1AC99F'}; 
                  margin: 20px 0; 
                  border-radius: 0 8px 8px 0;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .details { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                .urgent-banner { background: #FF6B6B; color: white; padding: 15px; text-align: center; margin: 15px 0; border-radius: 5px; }
                .team-signature { 
                  background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
                  padding: 20px; 
                  border-radius: 8px; 
                  margin: 20px 0;
                  border-left: 4px solid #1AC99F;
                }
                .cta-button {
                  display: inline-block;
                  padding: 12px 25px;
                  background: #1AC99F;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 15px 10px;
                  font-weight: bold;
                }
                .next-steps {
                  background: #e8f5e8;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  border-left: 4px solid #1AC99F;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${isUrgent ? '🚨' : '💬'} Response to Your Inquiry</h1>
                  <p>Our team has responded to your inquiry</p>
                </div>
                <div class="content">
                  ${isUrgent ? '<div class="urgent-banner"><strong>🚨 URGENT RESPONSE</strong><br>This message requires your immediate attention</div>' : ''}
                  
                  <p>Dear ${contactForm.name},</p>
                  
                  <p>Thank you for your patience. ${respondedBy?.name || 'Our team member'} has reviewed your inquiry and provided the following response:</p>
                  
                  <div class="response">
                    <h3>📝 Our Response:</h3>
                    <div style="font-size: 16px; line-height: 1.6;">${response.replace(/\n/g, '<br>')}</div>
                  </div>
                  
                  <div class="team-signature">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      <strong>Responded by:</strong> ${respondedBy?.name || 'GreonXpert Team'}<br>
                      <strong>Response date:</strong> ${new Date().toLocaleDateString()}<br>
                      <strong>Response time:</strong> ${new Date().toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div class="details">
                    <h3>📋 Your Original Inquiry:</h3>
                    <p><strong>Subject:</strong> ${contactForm.subject}</p>
                    <p><strong>Submitted:</strong> ${new Date(contactForm.createdAt).toLocaleDateString()}</p>
                    <p><strong>Priority:</strong> ${contactForm.priority.charAt(0).toUpperCase() + contactForm.priority.slice(1)}</p>
                  </div>
                  
                  <div class="next-steps">
                    <h3>🚀 What's Next?</h3>
                    <p>We're committed to helping you achieve your sustainability goals. Here's how you can proceed:</p>
                    <ul>
                      <li>📧 <strong>Reply to this email</strong> if you have any questions or need clarification</li>
                      <li>📞 <strong>Call us at +91 77365 38040</strong> to discuss your requirements in detail</li>
                      <li>💼 <strong>Schedule a consultation</strong> to explore our solutions further</li>
                      <li>🌐 <strong>Visit our website</strong> to learn more about our sustainability services</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="mailto:info@greonXpert.com?subject=Re: ${contactForm.subject}" class="cta-button">
                      📧 Reply to This Email
                    </a>
                    <a href="tel:+917736538040" class="cta-button" style="background: #2196F3;">
                      📞 Call Us Now
                    </a>
                  </div>
                  
                  <div class="details">
                    <h3>📞 Contact Information:</h3>
                    <p>If you need immediate assistance or have urgent questions:</p>
                    <ul>
                      <li><strong>Email:</strong> info@greonXpert.com</li>
                      <li><strong>Phone:</strong> +91 77365 38040</li>
                      <li><strong>Business Hours:</strong> Monday - Friday: 9:00 AM - 6:00 PM IST</li>
                      <li><strong>Saturday:</strong> 9:00 AM - 2:00 PM IST</li>
                    </ul>
                  </div>
                  
                  <p>We appreciate your interest in sustainable solutions and look forward to continuing our conversation!</p>
                  
                  <p>Best regards,<br>
                  <strong>${respondedBy?.name || 'The GreonXpert Team'}</strong><br>
                  <em>GreonXpert - Transforming Sustainability</em></p>
                </div>
                <div class="footer">
                  <p><strong>GreonXpert Pvt Ltd.</strong></p>
                  <p>Kalamassery, Ernakulam, Kerala, India</p>
                  <p>📞 +91 77365 38040 | 📧 info@greonXpert.com</p>
                  <p style="font-size: 12px; color: #999; margin-top: 15px;">
                    This email was sent in response to your inquiry. Please do not mark as spam.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Enhanced response email sent to user: ${contactForm.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send enhanced response email:', error);
      return false;
    }
  }

  // Legacy method for backward compatibility (redirects to enhanced version)
  async sendStatusUpdateEmail(contactForm, oldStatus, newStatus, updatedBy, reason) {
    return this.sendEnhancedStatusUpdateEmail(contactForm, oldStatus, newStatus, updatedBy, reason);
  }

  // Legacy method for backward compatibility (redirects to enhanced version)
  async sendResponseEmail(contactForm, response, respondedBy) {
    return this.sendEnhancedResponseEmail(contactForm, response, respondedBy, null, false);
  }

  // Send follow-up email reminder
  async sendFollowUpEmail(contactForm, followUpMessage, respondedBy) {
    try {
      const mailOptions = {
        from: `"${respondedBy?.name || 'GreonXpert Team'}" <${process.env.SMTP_USER}>`,
        to: contactForm.email,
        subject: `📋 Follow-up on Your Inquiry: ${contactForm.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .follow-up { background: white; padding: 25px; border-left: 4px solid #2196F3; margin: 20px 0; border-radius: 0 8px 8px 0; }
                .details { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 Follow-up on Your Inquiry</h1>
                  <p>We're checking in on your sustainability journey</p>
                </div>
                <div class="content">
                  <p>Dear ${contactForm.name},</p>
                  
                  <p>We wanted to follow up on your recent inquiry with GreonXpert. Your sustainability goals are important to us, and we want to ensure we're providing you with the best possible support.</p>
                  
                  <div class="follow-up">
                    <h3>💬 Follow-up Message:</h3>
                    <div style="font-size: 16px; line-height: 1.6;">${followUpMessage.replace(/\n/g, '<br>')}</div>
                  </div>
                  
                  <div class="details">
                    <h3>📋 Your Original Inquiry:</h3>
                    <p><strong>Subject:</strong> ${contactForm.subject}</p>
                    <p><strong>Submitted:</strong> ${new Date(contactForm.createdAt).toLocaleDateString()}</p>
                    <p><strong>Current Status:</strong> ${contactForm.status.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  
                  <p>We're here to help and would love to continue our conversation. Please feel free to reach out with any questions or updates on your sustainability initiatives.</p>
                  
                  <p>Best regards,<br>
                  <strong>${respondedBy?.name || 'The GreonXpert Team'}</strong></p>
                </div>
                <div class="footer">
                  <p>GreonXpert Pvt Ltd. | Kalamassery, Ernakulam, Kerala, India</p>
                  <p>📞 +91 77365 38040 | 📧 info@greonXpert.com</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Follow-up email sent to user: ${contactForm.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send follow-up email:', error);
      return false;
    }
  }

  // Send deal closure notification
  async sendDealClosureEmail(contactForm, dealDetails, respondedBy) {
    try {
      const mailOptions = {
        from: `"${respondedBy?.name || 'GreonXpert Team'}" <${process.env.SMTP_USER}>`,
        to: contactForm.email,
        subject: `🎉 Welcome to GreonXpert - Deal Confirmed: ${contactForm.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .celebration { background: #4CAF50; color: white; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; }
                .details { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .next-steps { background: white; padding: 20px; border-left: 4px solid #4CAF50; border-radius: 0 8px 8px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Congratulations!</h1>
                  <h2>Welcome to the GreonXpert Family!</h2>
                </div>
                <div class="content">
                  <div class="celebration">
                    <h2>🤝 Deal Confirmed!</h2>
                    <p style="font-size: 18px; margin-top: 15px;">We're thrilled to partner with you on your sustainability journey!</p>
                  </div>
                  
                  <p>Dear ${contactForm.name},</p>
                  
                  <p>Fantastic news! We're excited to confirm that your deal with GreonXpert has been finalized. Thank you for choosing us as your sustainability partner.</p>
                  
                  ${dealDetails ? `
                    <div class="details">
                      <h3>📋 Deal Summary:</h3>
                      <div>${dealDetails.replace(/\n/g, '<br>')}</div>
                    </div>
                  ` : ''}
                  
                  <div class="next-steps">
                    <h3>🚀 What Happens Next?</h3>
                    <ol>
                      <li><strong>Project Kickoff:</strong> Our project manager will contact you within 2 business days</li>
                      <li><strong>Team Introduction:</strong> Meet your dedicated sustainability experts</li>
                      <li><strong>Timeline Setup:</strong> We'll establish project milestones and deliverables</li>
                      <li><strong>Regular Updates:</strong> Receive progress reports and key insights</li>
                    </ol>
                  </div>
                  
                  <div class="details">
                    <h3>📞 Your Dedicated Support:</h3>
                    <p><strong>Account Manager:</strong> ${respondedBy?.name || 'Will be assigned soon'}</p>
                    <p><strong>Project Email:</strong> projects@greonXpert.com</p>
                    <p><strong>Support Phone:</strong> +91 77365 38040</p>
                  </div>
                  
                  <p>We're committed to delivering exceptional results and helping you achieve your sustainability goals. Our team is ready to make a positive impact together!</p>
                  
                  <p>Welcome aboard!<br>
                  <strong>The Entire GreonXpert Team</strong></p>
                </div>
                <div class="footer">
                  <p><strong>GreonXpert Pvt Ltd.</strong> - Your Sustainability Partner</p>
                  <p>Kalamassery, Ernakulam, Kerala, India</p>
                  <p>📞 +91 77365 38040 | 📧 info@greonXpert.com</p>
                </div>
              </div>
            </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Deal closure email sent to user: ${contactForm.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send deal closure email:', error);
      return false;
    }
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
