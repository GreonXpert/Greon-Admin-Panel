// utils/emailServiceCareer.js - Career Email Service with Professional Templates

const nodemailer = require('nodemailer');

// Email configuration - Similar to your existing emailService.js
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Company branding and styling for emails
const emailStyles = `
<style>
  .email-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .header {
    background: linear-gradient(135deg, #1AC99F 0%, #0E9A78 100%);
    color: white;
    padding: 30px 20px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
  }
  .header p {
    margin: 10px 0 0 0;
    font-size: 16px;
    opacity: 0.9;
  }
  .content {
    padding: 30px 25px;
    line-height: 1.6;
  }
  .status-badge {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
    margin: 10px 0;
  }
  .status-pending { background: #E3F2FD; color: #1976D2; }
  .status-reviewing { background: #FFF3E0; color: #F57C00; }
  .status-shortlisted { background: #E8F5E8; color: #388E3C; }
  .status-interview_scheduled { background: #F3E5F5; color: #7B1FA2; }
  .status-interviewed { background: #E1F5FE; color: #0277BD; }
  .status-selected { background: #C8E6C9; color: #2E7D32; }
  .status-rejected { background: #FFEBEE; color: #D32F2F; }
  .status-withdrawn { background: #F5F5F5; color: #616161; }
  .job-details {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    border-left: 4px solid #1AC99F;
  }
  .next-steps {
    background: linear-gradient(135deg, #E8F5E8 0%, #F0FDF4 100%);
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .congratulations {
    background: linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%);
    padding: 25px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: center;
  }
  .warning-box {
    background: #FFF3E0;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #FF9800;
    margin: 20px 0;
  }
  .footer {
    background: #f8f9fa;
    padding: 25px;
    text-align: center;
    border-top: 1px solid #e9ecef;
  }
  .social-links {
    margin: 15px 0;
  }
  .social-links a {
    display: inline-block;
    margin: 0 8px;
    padding: 8px 12px;
    background: #1AC99F;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 12px;
  }
  .button-primary {
    display: inline-block;
    background: linear-gradient(135deg, #1AC99F 0%, #0E9A78 100%);
    color: white;
    padding: 12px 25px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin: 10px 0;
  }
  .alert-success { color: #2E7D32; }
  .alert-warning { color: #F57C00; }
  .alert-error { color: #D32F2F; }
  .company-logo {
    font-size: 24px;
    font-weight: 800;
    color: white;
    margin-bottom: 5px;
  }
</style>
`;

class CareerEmailService {
  
  // Application confirmation email for candidates
  static async sendApplicationConfirmationEmail(application, job) {
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"Greon Xpert Careers" <${process.env.SMTP_USER}>`,
        to: application.email,
        subject: `✅ Application Received - ${job.jobRole} Position`,
        html: `
          ${emailStyles}
          <div class="email-container">
            <div class="header">
              <div class="company-logo">🌱 GREON XPERT</div>
              <h1>Application Received!</h1>
              <p>Thank you for applying to join our team</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${application.firstName}</strong>,</p>
              
              <p>Thank you for your interest in joining Greon Xpert! We have successfully received your application and are excited to learn more about you.</p>
              
              <div class="job-details">
                <h3 style="margin-top: 0; color: #1AC99F;">📋 Application Details</h3>
                <p><strong>Position:</strong> ${job.jobRole}</p>
                <p><strong>Department:</strong> ${job.department}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Experience Required:</strong> ${job.experienceRequired}</p>
                <p><strong>Application ID:</strong> <code>${application._id}</code></p>
                <p><strong>Submitted:</strong> ${new Date(application.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div class="next-steps">
                <h3 style="margin-top: 0;">⏰ What's Next?</h3>
                <p>Our recruitment team will review your application carefully. Here's what you can expect:</p>
                <ul>
                  <li>📧 <strong>Initial Review:</strong> 2-3 business days</li>
                  <li>📞 <strong>Phone Screening:</strong> If shortlisted, within 5-7 days</li>
                  <li>🤝 <strong>Interview Process:</strong> Technical and cultural fit interviews</li>
                  <li>🎉 <strong>Decision:</strong> Final outcome within 10-14 days</li>
                </ul>
              </div>
              
              <p>We appreciate your patience during our review process. If you have any questions, please don't hesitate to reach out to us at <strong>careers@greonxpert.com</strong>.</p>
              
              <p>Thank you for considering Greon Xpert as your next career destination!</p>
            </div>
            
            <div class="footer">
              <p><strong>Best regards,</strong><br>
              <span class="alert-success">🌱 Greon Xpert Recruitment Team</span></p>
              
              <div class="social-links">
                <a href="https://greonxpert.com">🌐 Website</a>
                <a href="mailto:info@greonxpert.com">📧 Email</a>
                <a href="tel:+917736538040">📞 Call Us</a>
              </div>
              
              <p style="font-size: 12px; color: #666; margin-top: 15px;">
                Greon Xpert Pvt Ltd | Sustainable Technology Solutions<br>
                This email was sent regarding your job application. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log('Application confirmation email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending application confirmation email:', error);
      throw error;
    }
  }

  // HR notification email about new applications
  static async sendApplicationNotificationEmail(application, job) {
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"Greon Xpert System" <${process.env.SMTP_USER}>`,
        to: process.env.HR_EMAIL || 'hr@greonxpert.com',
        subject: `🔔 New Job Application - ${job.jobRole}`,
        html: `
          ${emailStyles}
          <div class="email-container">
            <div class="header">
              <div class="company-logo">🌱 GREON XPERT</div>
              <h1>New Application Received</h1>
              <p>Action required - Review candidate application</p>
            </div>
            
            <div class="content">
              <p>A new application has been submitted for the <strong>${job.jobRole}</strong> position.</p>
              
              <div class="job-details">
                <h3 style="margin-top: 0; color: #1AC99F;">👤 Candidate Information</h3>
                <p><strong>Name:</strong> ${application.firstName} ${application.lastName}</p>
                <p><strong>Email:</strong> ${application.email}</p>
                <p><strong>Phone:</strong> ${application.phone}</p>
                <p><strong>Experience:</strong> ${application.experience}</p>
                <p><strong>Current Position:</strong> ${application.position}</p>
                <p><strong>Notice Period:</strong> ${application.noticePeriod}</p>
                <p><strong>Location:</strong> ${application.location?.current || 'Not specified'}</p>
                <p><strong>Application ID:</strong> <code>${application._id}</code></p>
              </div>
              
              <div class="job-details">
                <h3 style="margin-top: 0; color: #1AC99F;">💼 Position Details</h3>
                <p><strong>Job Role:</strong> ${job.jobRole}</p>
                <p><strong>Department:</strong> ${job.department}</p>
                <p><strong>Location:</strong> ${job.location}</p>
                <p><strong>Job Type:</strong> ${job.jobType}</p>
              </div>
              
              <div class="next-steps">
                <h3 style="margin-top: 0;">⚡ Quick Actions</h3>
                <p>Please log in to the admin panel to:</p>
                <ul>
                  <li>📄 Review the complete application</li>
                  <li>📎 Download candidate's resume</li>
                  <li>✅ Update application status</li>
                  <li>📧 Send candidate updates</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin'}/applications/${application._id}" class="button-primary">
                  👀 Review Application
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Greon Xpert HR System</strong><br>
              <span style="font-size: 12px; color: #666;">Automated notification - Please do not reply</span></p>
            </div>
          </div>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log('HR notification email sent:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending HR notification email:', error);
      throw error;
    }
  }

  // Status update emails with different templates based on status
  static async sendStatusUpdateEmail(application, status, note = '') {
    try {
      const transporter = createTransporter();
      
      const statusTemplates = {
        pending: {
          subject: '📋 Application Under Review',
          emoji: '📋',
          title: 'Application Under Review',
          message: 'Your application is currently being reviewed by our recruitment team.',
          color: '#1976D2',
          className: 'status-pending',
          nextSteps: [
            '📧 We will screen your application against job requirements',
            '⏰ Review process typically takes 2-3 business days',
            '📞 If suitable, we will contact you for next steps'
          ]
        },
        reviewing: {
          subject: '🔍 Application Being Reviewed',
          emoji: '🔍',
          title: 'Detailed Review in Progress',
          message: 'Great news! Your application has passed the initial screening and is now being reviewed in detail by our hiring team.',
          color: '#F57C00',
          className: 'status-reviewing',
          nextSteps: [
            '👥 Your profile is being evaluated by the hiring manager',
            '📊 We are assessing your technical and cultural fit',
            '📞 Expect to hear from us within 3-5 business days'
          ]
        },
        shortlisted: {
          subject: '🎉 Congratulations! You\'ve Been Shortlisted',
          emoji: '🎉',
          title: 'You\'ve Been Shortlisted!',
          message: 'Congratulations! Your application has impressed our team and you have been shortlisted for the next round.',
          color: '#2E7D32',
          className: 'status-shortlisted',
          nextSteps: [
            '📞 Our HR team will contact you within 24-48 hours',
            '📅 We will schedule a phone/video interview',
            '📋 Please prepare for technical and behavioral questions'
          ],
          isGoodNews: true
        },
        interview_scheduled: {
          subject: '📅 Interview Scheduled - Next Steps',
          emoji: '📅',
          title: 'Interview Scheduled',
          message: 'Your interview has been scheduled! We\'re looking forward to getting to know you better.',
          color: '#7B1FA2',
          className: 'status-interview_scheduled',
          nextSteps: [
            '📧 You will receive a separate email with interview details',
            '🎯 Please prepare questions about the role and company',
            '💻 Technical candidates should be ready for coding exercises',
            '📋 Bring any questions about role expectations'
          ],
          isGoodNews: true
        },
        interviewed: {
          subject: '🤝 Thank You for the Interview',
          emoji: '🤝',
          title: 'Interview Completed',
          message: 'Thank you for taking the time to interview with us. We enjoyed learning more about your background and experience.',
          color: '#0277BD',
          className: 'status-interviewed',
          nextSteps: [
            '⏰ We are currently evaluating all candidates',
            '📊 Final decision will be made within 3-5 business days',
            '📧 We will notify you of the outcome regardless of the decision',
            '🤔 Feel free to reach out if you have any questions'
          ]
        },
        selected: {
          subject: '🚀 Congratulations! Job Offer - Welcome to Greon Xpert',
          emoji: '🚀',
          title: 'You\'ve Been Selected!',
          message: 'Congratulations! We are thrilled to extend a job offer for the position. Welcome to the Greon Xpert family!',
          color: '#1AC99F',
          className: 'status-selected',
          nextSteps: [
            '📄 Our HR team will send you the detailed offer letter',
            '📋 Please review all terms and conditions carefully',
            '✅ Respond with your acceptance within 5 business days',
            '📞 Contact us for any questions about the offer'
          ],
          isGoodNews: true,
          isFinalGood: true
        },
        rejected: {
          subject: '📧 Application Status Update',
          emoji: '📧',
          title: 'Application Status Update',
          message: 'Thank you for your interest in Greon Xpert and for the time you invested in the application process.',
          color: '#D32F2F',
          className: 'status-rejected',
          nextSteps: [
            '🙏 We appreciate your interest in joining our team',
            '📈 We encourage you to apply for other suitable positions',
            '🔄 Keep an eye on our careers page for new opportunities',
            '💡 Consider gaining more experience in relevant areas'
          ],
          isFinalBad: true
        },
        withdrawn: {
          subject: '🔄 Application Withdrawn - Confirmation',
          emoji: '🔄',
          title: 'Application Withdrawn',
          message: 'Your application has been withdrawn as requested. Thank you for your interest in Greon Xpert.',
          color: '#616161',
          className: 'status-withdrawn',
          nextSteps: [
            '✅ Your application has been removed from our system',
            '🔄 You are welcome to reapply for future positions',
            '📧 We will keep your profile for relevant future openings',
            '🤝 Thank you for considering Greon Xpert'
          ]
        }
      };

      const template = statusTemplates[status];
      if (!template) {
        throw new Error(`Unknown status: ${status}`);
      }

      const mailOptions = {
        from: `"Greon Xpert Careers" <${process.env.SMTP_USER}>`,
        to: application.email,
        subject: template.subject,
        html: `
          ${emailStyles}
          <div class="email-container">
            <div class="header">
              <div class="company-logo">🌱 GREON XPERT</div>
              <h1>${template.emoji} ${template.title}</h1>
              <p>Application Status Update</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${application.firstName}</strong>,</p>
              
              ${template.isGoodNews ? '<div class="congratulations">' : ''}
              ${template.isFinalGood ? '<h2 style="margin:0; color: #1AC99F;">🎉 CONGRATULATIONS! 🎉</h2><br>' : ''}
              <p>${template.message}</p>
              ${template.isGoodNews ? '</div>' : ''}
              
              <div class="job-details">
                <h3 style="margin-top: 0; color: #1AC99F;">📋 Application Details</h3>
                <p><strong>Position:</strong> ${application.jobRole}</p>
                <p><strong>Application ID:</strong> <code>${application._id}</code></p>
                <p><strong>Current Status:</strong> 
                  <span class="status-badge ${template.className}">
                    ${template.emoji} ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </span>
                </p>
                <p><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
                ${note ? `<p><strong>Additional Note:</strong> ${note}</p>` : ''}
              </div>
              
              <div class="next-steps">
                <h3 style="margin-top: 0;">⏰ What's Next?</h3>
                <ul>
                  ${template.nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ul>
              </div>
              
              ${template.isFinalBad ? `
              <div class="warning-box">
                <p><strong>🔍 Feedback for Future Applications:</strong></p>
                <p>While we won't be moving forward with your application at this time, we were impressed by your interest in sustainability and environmental technology. We encourage you to:</p>
                <ul>
                  <li>Continue developing skills relevant to your target role</li>
                  <li>Gain more experience in environmental or tech sectors</li>
                  <li>Follow our company updates for future opportunities</li>
                </ul>
              </div>
              ` : ''}
              
              <p>If you have any questions about this update, please feel free to contact our HR team at <strong>careers@greonxpert.com</strong>.</p>
              
              ${template.isFinalGood ? 
                '<p><strong>We are excited to have you join our mission to create a more sustainable future! 🌱</strong></p>' :
                '<p>Thank you for your interest in Greon Xpert!</p>'
              }
            </div>
            
            <div class="footer">
              <p><strong>Best regards,</strong><br>
              <span class="alert-success">🌱 Greon Xpert Recruitment Team</span></p>
              
              <div class="social-links">
                <a href="https://greonxpert.com">🌐 Website</a>
                <a href="mailto:careers@greonxpert.com">📧 Careers</a>
                <a href="tel:+917736538040">📞 Contact</a>
              </div>
              
              <p style="font-size: 12px; color: #666; margin-top: 15px;">
                Greon Xpert Pvt Ltd | Sustainable Technology Solutions<br>
                This email was sent regarding your job application ID: ${application._id}
              </p>
            </div>
          </div>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log(`Status update email sent for ${status}:`, result.messageId);
      return result;
      
    } catch (error) {
      console.error('Error sending status update email:', error);
      throw error;
    }
  }

  // Test email configuration
  static async testEmailConfiguration() {
    try {
      const transporter = createTransporter();
      const result = await transporter.verify();
      console.log('Email configuration is valid:', result);
      return result;
    } catch (error) {
      console.error('Email configuration error:', error);
      throw error;
    }
  }
}

module.exports = CareerEmailService;
