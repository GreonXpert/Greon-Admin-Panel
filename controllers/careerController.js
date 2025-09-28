// controllers/careerController.js - Updated with emailServiceCareer

const Career = require('../models/Career');
const Application = require('../models/Application');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const {
  sendApplicationConfirmationEmail,
  sendApplicationNotificationEmail,
  sendStatusUpdateEmail,
  testEmailConfiguration
} = require('../utils/emailServiceCareer');

// Helper function to sanitize update data
const sanitizeUpdateData = (data) => {
  const sanitized = { ...data };

  // Parse array fields that might come as strings
  if ('responsibilities' in sanitized && typeof sanitized.responsibilities === 'string') {
    try {
      sanitized.responsibilities = JSON.parse(sanitized.responsibilities);
    } catch (e) {
      sanitized.responsibilities = sanitized.responsibilities.split('\\n').filter(Boolean);
    }
  }

  if ('requirements' in sanitized && typeof sanitized.requirements === 'string') {
    try {
      sanitized.requirements = JSON.parse(sanitized.requirements);
    } catch (e) {
      sanitized.requirements = sanitized.requirements.split('\\n').filter(Boolean);
    }
  }

  if ('skills' in sanitized && typeof sanitized.skills === 'string') {
    try {
      sanitized.skills = JSON.parse(sanitized.skills);
    } catch (e) {
      sanitized.skills = sanitized.skills.split(',').map(skill => skill.trim()).filter(Boolean);
    }
  }

  if ('benefits' in sanitized && typeof sanitized.benefits === 'string') {
    try {
      sanitized.benefits = JSON.parse(sanitized.benefits);
    } catch (e) {
      sanitized.benefits = sanitized.benefits.split('\\n').filter(Boolean);
    }
  }

  // Parse salary range
  if ('salaryRange' in sanitized && typeof sanitized.salaryRange === 'string') {
    try {
      sanitized.salaryRange = JSON.parse(sanitized.salaryRange);
    } catch (e) {
      const parts = sanitized.salaryRange.split('-');
      if (parts.length === 2) {
        sanitized.salaryRange = {
          min: parseInt(parts[0]) || 0,
          max: parseInt(parts[1]) || 0,
          currency: 'INR'
        };
      }
    }
  }

  // Remove any undefined or null values
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === 'undefined' || sanitized[key] === 'null') {
      delete sanitized[key];
    }
  });

  return sanitized;
};

// Get all jobs with filtering and pagination
const getAllJobs = async (req, res) => {
  try {
    const { 
      department, 
      jobType, 
      status = 'active', 
      page = 1, 
      limit = 10, 
      sort = '-createdAt', 
      search, 
      featured 
    } = req.query;

    // Build filter object
    const filter = { status };

    // Add expiry filter for active jobs
    if (status === 'active') {
      filter.expiresAt = { $gt: new Date() };
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (jobType && jobType !== 'all') {
      filter.jobType = jobType;
    }

    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    if (search) {
      filter.$or = [
        { jobRole: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await Career.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Career.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

// Get single job by ID or slug
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Career.findOne({
      $or: [{ _id: id }, { slug: id }],
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or expired'
      });
    }

    // Increment view count
    try {
      await Career.findByIdAndUpdate(job._id, { $inc: { viewCount: 1 } });
    } catch (updateError) {
      console.warn('View count update failed:', updateError.message);
    }

    // Emit real-time view event
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('careers').emit('job-viewed', {
          jobId: job._id,
          jobRole: job.jobRole,
          department: job.department,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
};

// Create new job
const createJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let jobData = sanitizeUpdateData(req.body);

    // Handle file upload
    if (req.file) {
      jobData.image = `/uploads/careers/${req.file.filename}`;
    }

    const job = new Career(jobData);
    await job.save();

    // Emit real-time creation event
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('careers').emit('job-created', {
          success: true,
          data: job,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message
    });
  }
};

// Update job
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let updateData = sanitizeUpdateData({
      ...req.body,
      updatedAt: new Date()
    });

    // Handle file upload
    if (req.file) {
      updateData.image = `/uploads/careers/${req.file.filename}`;
    }

    const job = await Career.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Emit real-time update event
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('careers').emit('job-updated', {
          success: true,
          data: job,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: error.message
    });
  }
};

// Delete job
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Career.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Delete associated image file
    if (job.image) {
      const imagePath = path.join(__dirname, '..', job.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete all applications for this job
    await Application.deleteMany({ jobId: id });

    // Emit real-time deletion event
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('careers').emit('job-deleted', {
          jobId: id,
          jobRole: job.jobRole,
          department: job.department,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
};

// Get featured jobs
const getFeaturedJobs = async (req, res) => {
  try {
    const jobs = await Career.getFeaturedJobs();
    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Get featured jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured jobs',
      error: error.message
    });
  }
};

// Get jobs by department
const getJobsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const jobs = await Career.getJobsByDepartment(department);
    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Get jobs by department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs by department',
      error: error.message
    });
  }
};

// Apply for job
const applyForJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId } = req.params;
    let applicationData = { ...req.body, jobId };

    // Check if job exists and is active
    const job = await Career.findOne({
      _id: jobId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or expired'
      });
    }

    applicationData.jobRole = job.jobRole;

    // Handle file uploads
    if (req.files) {
      if (req.files.resume && req.files.resume[0]) {
        applicationData.resume = {
          filename: req.files.resume[0].filename,
          path: req.files.resume[0].path,
          originalName: req.files.resume[0].originalname,
          mimetype: req.files.resume[0].mimetype,
          size: req.files.resume[0].size
        };
      }

      if (req.files.additionalDocuments) {
        applicationData.additionalDocuments = req.files.additionalDocuments.map(file => ({
          filename: file.filename,
          path: file.path,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          description: req.body.documentDescription || ''
        }));
      }
    }

    // Parse complex fields
    if (applicationData.skills && typeof applicationData.skills === 'string') {
      try {
        applicationData.skills = JSON.parse(applicationData.skills);
      } catch (e) {
        applicationData.skills = applicationData.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const application = new Application(applicationData);
    await application.save();

    // Update job application count
    await Career.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

    // Send emails using emailServiceCareer
    try {
      await Promise.all([
        sendApplicationConfirmationEmail(application, job),
        sendApplicationNotificationEmail(application, job)
      ]);
      console.log('Application emails sent successfully');
    } catch (emailError) {
      console.warn('Failed to send application emails:', emailError.message);
    }

    // Emit real-time application event
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('careers').emit('application-received', {
          success: true,
          applicationId: application._id,
          jobId: job._id,
          jobRole: job.jobRole,
          applicantName: `${application.firstName} ${application.lastName}`,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: application._id,
        jobRole: job.jobRole,
        status: application.status
      }
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

// Get all applications (admin)
const getAllApplications = async (req, res) => {
  try {
    const { jobId, status, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (jobId) filter.jobId = jobId;
    if (status && status !== 'all') filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const applications = await Application.find(filter)
      .populate('jobId', 'jobRole department location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Application.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// Get single application
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id)
      .populate('jobId', 'jobRole department location requirements skills')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: error.message
    });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, addedBy = 'Admin' } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.updateStatus(status, note, addedBy);

    // Send status update email using emailServiceCareer
    try {
      await sendStatusUpdateEmail(application, status, note);
      console.log('Status update email sent successfully');
    } catch (emailError) {
      console.warn('Failed to send status update email:', emailError.message);
    }

    // Emit real-time status update
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('careers').emit('application-status-updated', {
          success: true,
          applicationId: application._id,
          status,
          applicantName: `${application.firstName} ${application.lastName}`,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

// Download resume
const downloadResume = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!application.resume || !application.resume.path) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const filePath = path.resolve(application.resume.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found on server'
      });
    }

    const fileName = application.resume.originalName || `${application.firstName}_${application.lastName}_Resume.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', application.resume.mimetype || 'application/pdf');
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download resume',
      error: error.message
    });
  }
};

// Test email configuration
const testEmailService = async (req, res) => {
  try {
    const result = await testEmailConfiguration();
    res.json({
      success: true,
      message: 'Email service is configured correctly',
      data: result
    });
  } catch (error) {
    console.error('Email service test error:', error);
    res.status(500).json({
      success: false,
      message: 'Email service configuration error',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getFeaturedJobs,
  getJobsByDepartment,
  applyForJob,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  downloadResume,
  testEmailService
};
