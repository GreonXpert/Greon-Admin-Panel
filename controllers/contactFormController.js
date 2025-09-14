// controllers/contactFormController.js
const mongoose = require('mongoose');
const ContactForm = require('../models/contactForm');
const EmailService = require('../utils/emailService');

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'];
};

// @desc Create new contact form submission
// @route POST /api/contact-forms
// @access Public
exports.createContactForm = async (req, res) => {
  try {
    console.log('📝 New contact form submission received');
    console.log('📄 Request body:', req.body);

    const {
      name, email, phone, company, designation,
      subject, message, inquiryType, priority
    } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, subject, message'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Create contact form entry
    const contactForm = new ContactForm({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      company: company?.trim(),
      designation: designation?.trim(),
      subject: subject.trim(),
      message: message.trim(),
      inquiryType: inquiryType || 'general',
      priority: priority || 'medium',
      source: 'website',
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent'),
      statusHistory: [{
        status: 'open',
        changedDate: new Date()
      }]
    });

    await contactForm.save();
    console.log('✅ Contact form saved successfully');

    // Initialize email tracking
    let userEmailSent = false;
    let adminEmailSent = false;
    const emailErrors = [];

    // Send confirmation email to user
    try {
      console.log('📧 Sending confirmation email to user...');
      userEmailSent = await EmailService.sendUserConfirmationEmail(contactForm);
      if (userEmailSent) {
        console.log('✅ Confirmation email sent to user successfully');
      } else {
        console.log('⚠️ Confirmation email to user failed - no error thrown');
        emailErrors.push('User confirmation email failed');
      }
    } catch (emailError) {
      console.error('❌ User confirmation email failed:', emailError);
      emailErrors.push(`User email error: ${emailError.message}`);
    }

    // Send email notification to SuperAdmin and other admins
    try {
      console.log('📧 Sending notification email to admins...');
      adminEmailSent = await EmailService.sendContactFormNotification(contactForm);
      if (adminEmailSent) {
        console.log('✅ Admin notification email sent successfully');
        
        // Update contact form with email sent status
        contactForm.emailSent = true;
        contactForm.emailSentDate = new Date();
        await contactForm.save();
      } else {
        console.log('⚠️ Admin notification email failed - no error thrown');
        emailErrors.push('Admin notification email failed');
      }
    } catch (emailError) {
      console.error('❌ Admin notification email failed:', emailError);
      emailErrors.push(`Admin email error: ${emailError.message}`);
    }

    // Emit real-time notification via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        // Emit to general contact form room
        io.emit('new-contact-form', {
          success: true,
          data: contactForm,
          message: 'New contact form submission received',
          timestamp: new Date().toISOString()
        });

        // Emit to admin-specific room for real-time updates
        io.to('contact-forms-admin').emit('new-contact-form-admin', {
          success: true,
          data: contactForm,
          priority: contactForm.priority,
          isUrgent: contactForm.priority === 'urgent' || contactForm.priority === 'high',
          timestamp: new Date().toISOString()
        });

        console.log('✅ Real-time notification sent via Socket.IO');
      }
    } catch (socketError) {
      console.error('⚠️ Socket.IO notification failed:', socketError);
      // Don't fail the request for socket errors
    }

    // Prepare response based on email status
    let responseMessage = 'Thank you for contacting us! We have received your inquiry and will get back to you soon.';
    let emailStatus = {
      userEmailSent,
      adminEmailSent,
      totalEmailsSent: (userEmailSent ? 1 : 0) + (adminEmailSent ? 1 : 0)
    };

    // Add email status to response for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      emailStatus.errors = emailErrors;
    }

    // Log email sending summary
    console.log('📊 Email Sending Summary:');
    console.log(`   User Email: ${userEmailSent ? '✅ Sent' : '❌ Failed'}`);
    console.log(`   Admin Email: ${adminEmailSent ? '✅ Sent' : '❌ Failed'}`);
    console.log(`   Total Emails Sent: ${emailStatus.totalEmailsSent}/2`);

    if (emailErrors.length > 0) {
      console.log('⚠️ Email Errors:', emailErrors);
    }

    // Modify response message based on email success
    if (!userEmailSent) {
      responseMessage += ' Note: Confirmation email could not be sent, but your inquiry has been received.';
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        id: contactForm._id,
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject,
        status: contactForm.status,
        priority: contactForm.priority,
        inquiryType: contactForm.inquiryType,
        submittedAt: contactForm.createdAt,
        emailStatus: process.env.NODE_ENV === 'development' ? emailStatus : {
          confirmationSent: userEmailSent,
          adminNotified: adminEmailSent
        }
      }
    });

  } catch (error) {
    console.error('❌ createContactForm error:', error);
    
    // Handle specific error types
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A submission with this email already exists recently. Please wait before submitting again.'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format provided'
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};


// @desc Get all contact forms with filtering and pagination
// @route GET /api/contact-forms
// @access Private (Admin/SuperAdmin)
exports.getAllContactForms = async (req, res) => {
  try {
    const {
      status,
      priority,
      inquiryType,
      assignedTo,
      isRead,
      isArchived,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Inquiry type filter
    if (inquiryType && inquiryType !== 'all') {
      query.inquiryType = inquiryType;
    }

    // Assigned to filter
    if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }

    // Read status filter
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Archive status filter
    if (isArchived !== undefined) {
      query.isArchived = isArchived === 'true';
    } else {
      // Default: don't show archived unless specifically requested
      query.isArchived = false;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { subject: searchRegex },
        { message: searchRegex }
      ];
    }

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with population
    const contactForms = await ContactForm.find(query)
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count for pagination
    const totalCount = await ContactForm.countDocuments(query);

    // Get statistics
    const stats = await ContactForm.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: null,
          totalForms: { $sum: 1 },
          openForms: {
            $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
          },
          inProgressForms: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          closedForms: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          },
          unreadForms: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          highPriorityForms: {
            $sum: { $cond: [{ $in: ['$priority', ['high', 'urgent']] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: contactForms,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
        hasNext: pageNum * limitNum < totalCount,
        hasPrev: pageNum > 1
      },
      stats: stats[0] || {
        totalForms: 0,
        openForms: 0,
        inProgressForms: 0,
        closedForms: 0,
        unreadForms: 0,
        highPriorityForms: 0
      }
    });
  } catch (error) {
    console.error('getAllContactForms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact forms'
    });
  }
};


// @desc Get single contact form by ID
// @route GET /api/contact-forms/:id
// @access Private (Admin/SuperAdmin)
exports.getContactFormById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact form ID'
      });
    }

    const contactForm = await ContactForm.findById(id)
      .populate('assignedTo', 'name email avatar')
      .populate('responses.respondedBy', 'name email avatar')
      .populate('statusHistory.changedBy', 'name email')
      .populate('readBy.user', 'name email');

    if (!contactForm) {
      return res.status(404).json({
        success: false,
        message: 'Contact form not found'
      });
    }

    // Mark as read for current user
    if (req.user && !contactForm.isRead) {
      contactForm.markAsRead(req.user._id);
      await contactForm.save();
    }

    res.json({
      success: true,
      data: contactForm
    });
  } catch (error) {
    console.error('getContactFormById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact form'
    });
  }
};


// @desc Update contact form status and details
// @route PUT /api/contact-forms/:id
// @access Private (Admin/SuperAdmin)
exports.updateContactForm = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, priority, assignedTo, notes, tags,
      followUpDate, estimatedValue, sendUpdateEmail,
      statusChangeReason
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact form ID'
      });
    }

    const contactForm = await ContactForm.findById(id);
    if (!contactForm) {
      return res.status(404).json({
        success: false,
        message: 'Contact form not found'
      });
    }

    const oldStatus = contactForm.status;

    // Update fields
    if (status && status !== contactForm.status) {
      contactForm.status = status;
      contactForm.statusHistory.push({
        status: status,
        changedBy: req.user._id,
        changedDate: new Date(),
        reason: statusChangeReason || 'Status updated'
      });

      // Send status update email to user if requested
      if (sendUpdateEmail) {
        try {
          await EmailService.sendEnhancedStatusUpdateEmail(
            contactForm, 
            oldStatus, 
            status, 
            req.user,
            statusChangeReason
          );
          console.log('✅ Enhanced status update email sent to user');
        } catch (emailError) {
          console.error('⚠️ Status update email failed:', emailError);
        }
      }
    }

    if (priority) contactForm.priority = priority;
    if (assignedTo) {
      contactForm.assignedTo = assignedTo;
      contactForm.assignedDate = new Date();
    }
    if (notes !== undefined) contactForm.notes = notes;
    if (tags) contactForm.tags = Array.isArray(tags) ? tags : [tags];
    if (followUpDate) contactForm.followUpDate = new Date(followUpDate);
    if (estimatedValue !== undefined) contactForm.estimatedValue = estimatedValue;

    await contactForm.save();

    // Populate and return updated data
    const updatedContactForm = await ContactForm.findById(id)
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name email');

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('contact-form-updated', {
        success: true,
        data: updatedContactForm,
        action: 'updated'
      });
    }

    res.json({
      success: true,
      message: 'Contact form updated successfully',
      data: updatedContactForm
    });
  } catch (error) {
    console.error('updateContactForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact form'
    });
  }
};

// @desc Add response to contact form
// @route POST /api/contact-forms/:id/responses
// @access Private (Admin/SuperAdmin)
exports.addResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      response, 
      responseType, 
      sendEmail, 
      emailSubject, 
      isUrgent 
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact form ID'
      });
    }

    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const contactForm = await ContactForm.findById(id);
    if (!contactForm) {
      return res.status(404).json({
        success: false,
        message: 'Contact form not found'
      });
    }

    // Add response
    const newResponse = {
      respondedBy: req.user._id,
      response: response.trim(),
      responseType: responseType || 'internal_note',
      responseDate: new Date(),
      emailSubject: emailSubject || '',
      isUrgent: isUrgent || false
    };

    contactForm.responses.push(newResponse);

    // Update status if it's still open
    if (contactForm.status === 'open') {
      contactForm.status = 'in_progress';
      contactForm.statusHistory.push({
        status: 'in_progress',
        changedBy: req.user._id,
        changedDate: new Date(),
        reason: 'Response added'
      });
    }

    await contactForm.save();

    // Send email to customer if requested and response type is email
    if (sendEmail && responseType === 'email') {
      try {
        await EmailService.sendEnhancedResponseEmail(
          contactForm, 
          response, 
          req.user, 
          emailSubject,
          isUrgent
        );
        
        // Update the response to indicate email was sent
        const lastResponse = contactForm.responses[contactForm.responses.length - 1];
        lastResponse.emailSent = true;
        lastResponse.emailSentDate = new Date();
        await contactForm.save();
        
        console.log('✅ Enhanced response email sent to customer');
      } catch (emailError) {
        console.error('⚠️ Failed to send response email:', emailError);
      }
    }

    // Populate and return updated data
    const updatedContactForm = await ContactForm.findById(id)
      .populate('assignedTo', 'name email')
      .populate('responses.respondedBy', 'name email');

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('contact-form-response-added', {
        success: true,
        data: updatedContactForm,
        newResponse: newResponse
      });
    }

    res.json({
      success: true,
      message: responseType === 'email' && sendEmail 
        ? 'Response sent to customer successfully!' 
        : 'Response added successfully!',
      data: updatedContactForm
    });
  } catch (error) {
    console.error('addResponse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add response'
    });
  }
};




// @desc Delete contact form (soft delete - archive)
// @route DELETE /api/contact-forms/:id
// @access Private (SuperAdmin only)
exports.deleteContactForm = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact form ID'
      });
    }

    const contactForm = await ContactForm.findById(id);
    if (!contactForm) {
      return res.status(404).json({
        success: false,
        message: 'Contact form not found'
      });
    }

    // Soft delete (archive)
    contactForm.isArchived = true;
    contactForm.archivedDate = new Date();
    await contactForm.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('contact-form-archived', {
        success: true,
        data: { id: contactForm._id },
        action: 'archived'
      });
    }

    res.json({
      success: true,
      message: 'Contact form archived successfully'
    });
  } catch (error) {
    console.error('deleteContactForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive contact form'
    });
  }
};


// @desc Get contact form analytics/dashboard data
// @route GET /api/contact-forms/analytics/dashboard
// @access Private (Admin/SuperAdmin)
exports.getAnalytics = async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const analytics = await ContactForm.aggregate([
      {
        $facet: {
          // Overall statistics
          totalStats: [
            {
              $group: {
                _id: null,
                totalForms: { $sum: 1 },
                totalOpen: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                totalInProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                totalClosed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                totalDeals: { $sum: { $cond: [{ $eq: ['$status', 'deal_signed'] }, 1, 0] } },
                totalRejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                avgResponseTime: { $avg: '$responseTime' },
                totalEstimatedValue: { $sum: '$estimatedValue' }
              }
            }
          ],
          // Recent period statistics
          recentStats: [
            { $match: { createdAt: { $gte: startDate } } },
            {
              $group: {
                _id: null,
                recentForms: { $sum: 1 },
                recentDeals: { $sum: { $cond: [{ $eq: ['$status', 'deal_signed'] }, 1, 0] } },
                recentValue: { $sum: '$estimatedValue' }
              }
            }
          ],
          // Status distribution
          statusDistribution: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                percentage: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Priority distribution
          priorityDistribution: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Inquiry type distribution
          inquiryTypeDistribution: [
            {
              $group: {
                _id: '$inquiryType',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Monthly trend
          monthlyTrend: [
            { $match: { createdAt: { $gte: startDate } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                deals: { $sum: { $cond: [{ $eq: ['$status', 'deal_signed'] }, 1, 0] } },
                value: { $sum: '$estimatedValue' }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ],
          // Top sources
          sourceDistribution: [
            {
              $group: {
                _id: '$source',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const result = analytics[0];

    res.json({
      success: true,
      data: {
        overview: result.totalStats[0] || {},
        recent: result.recentStats[0] || {},
        distributions: {
          status: result.statusDistribution,
          priority: result.priorityDistribution,
          inquiryType: result.inquiryTypeDistribution,
          source: result.sourceDistribution
        },
        trends: {
          monthly: result.monthlyTrend
        },
        timeRange: timeRange
      }
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
};


// @desc Mark contact forms as read
// @route PUT /api/contact-forms/bulk/mark-read
// @access Private (Admin/SuperAdmin)
exports.bulkMarkAsRead = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of contact form IDs'
      });
    }

    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid contact form IDs provided'
      });
    }

    await ContactForm.updateMany(
      { _id: { $in: validIds } },
      { 
        $set: { isRead: true },
        $addToSet: { readBy: { user: req.user._id, readDate: new Date() } }
      }
    );

    res.json({
      success: true,
      message: `${validIds.length} contact forms marked as read`
    });

  } catch (error) {
    console.error('bulkMarkAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark contact forms as read'
    });
  }
};
