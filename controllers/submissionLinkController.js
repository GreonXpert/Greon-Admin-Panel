// controllers/submissionLinkController.js - FIXED VERSION
const SubmissionLink = require('../models/SubmissionLink');
const { validationResult } = require('express-validator');

class SubmissionLinkController {
  // Create new submission link
  static async createSubmissionLink(req, res) {
    try {
      console.log('📝 Creating submission link with data:', req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        title,
        description,
        allowedCategories,
        maxSubmissions = 10,
        expiresInDays = 30
      } = req.body;

      // Validate required fields
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      if (!allowedCategories || !Array.isArray(allowedCategories) || allowedCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one category must be allowed'
        });
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      // ✅ FIX: Create submission link without token/password - let middleware generate them
      const submissionLinkData = {
        title: title.trim(),
        description: description?.trim() || '',
        allowedCategories,
        maxSubmissions: Math.min(Math.max(parseInt(maxSubmissions) || 10, 1), 100),
        expiresAt,
        createdBy: req.user._id
        // Don't set token or password - let pre-validate middleware handle this
      };

      console.log('📝 Creating submission link with data:', submissionLinkData);

      const submissionLink = new SubmissionLink(submissionLinkData);
      await submissionLink.save();

      console.log('✅ Submission link created:', {
        id: submissionLink._id,
        token: submissionLink.token,
        password: submissionLink.password
      });

      // Emit real-time event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-link-created', {
            success: true,
            data: submissionLink,
            createdBy: req.user,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      // ✅ FIX: Include both URL and password in response
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      res.status(201).json({
        success: true,
        message: 'Submission link created successfully',
        data: {
          ...submissionLink.toObject(),
          url: `${frontendUrl}/submit/${submissionLink.token}`,
          // Explicitly include password for admin use
          password: submissionLink.password,
          token: submissionLink.token
        }
      });
    } catch (error) {
      console.error('Create submission link error:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'A submission link with this token already exists. Please try again.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create submission link',
        error: error.message
      });
    }
  }

  // Get all submission links
  static async getAllSubmissionLinks(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      
      const filter = {};
      if (status === 'active') {
        filter.isActive = true;
        filter.expiresAt = { $gt: new Date() };
      } else if (status === 'expired') {
        filter.expiresAt = { $lte: new Date() };
      } else if (status === 'inactive') {
        filter.isActive = false;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const submissionLinks = await SubmissionLink.find(filter)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await SubmissionLink.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      // Add URL to each link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const linksWithUrls = submissionLinks.map(link => ({
        ...link,
        url: `${frontendUrl}/submit/${link.token}`
      }));

      res.json({
        success: true,
        data: {
          submissionLinks: linksWithUrls,
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
      console.error('Get submission links error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submission links',
        error: error.message
      });
    }
  }

  // Get single submission link
  static async getSubmissionLink(req, res) {
    try {
      const { id } = req.params;
      
      const submissionLink = await SubmissionLink.findById(id)
        .populate('createdBy', 'name email role')
        .populate('submissions');

      if (!submissionLink) {
        return res.status(404).json({
          success: false,
          message: 'Submission link not found'
        });
      }

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      res.json({
        success: true,
        data: {
          ...submissionLink.toObject(),
          url: `${frontendUrl}/submit/${submissionLink.token}`
        }
      });
    } catch (error) {
      console.error('Get submission link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submission link',
        error: error.message
      });
    }
  }

  // Toggle submission link status
  static async toggleSubmissionLink(req, res) {
    try {
      const { id } = req.params;
      
      const submissionLink = await SubmissionLink.findById(id);
      if (!submissionLink) {
        return res.status(404).json({
          success: false,
          message: 'Submission link not found'
        });
      }

      submissionLink.isActive = !submissionLink.isActive;
      await submissionLink.save();

      // Emit real-time event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-link-updated', {
            success: true,
            data: submissionLink,
            updatedBy: req.user,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: `Submission link ${submissionLink.isActive ? 'activated' : 'deactivated'} successfully`,
        data: submissionLink
      });
    } catch (error) {
      console.error('Toggle submission link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update submission link',
        error: error.message
      });
    }
  }

  // Delete submission link
  static async deleteSubmissionLink(req, res) {
    try {
      const { id } = req.params;
      
      const submissionLink = await SubmissionLink.findByIdAndDelete(id);
      if (!submissionLink) {
        return res.status(404).json({
          success: false,
          message: 'Submission link not found'
        });
      }

      // Emit real-time event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-link-deleted', {
            linkId: id,
            title: submissionLink.title,
            deletedBy: req.user,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: 'Submission link deleted successfully'
      });
    } catch (error) {
      console.error('Delete submission link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete submission link',
        error: error.message
      });
    }
  }

  // Validate submission link (public route)
  static async validateSubmissionLink(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const submissionLink = await SubmissionLink.findOne({ token });

      if (!submissionLink) {
        return res.status(404).json({
          success: false,
          message: 'Invalid submission link'
        });
      }

      // Log access attempt
      submissionLink.usageLog.push({
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: false
      });

      // Check if expired
      if (submissionLink.isExpired()) {
        await submissionLink.save();
        return res.status(410).json({
          success: false,
          message: 'This submission link has expired'
        });
      }

      // Check if inactive
      if (!submissionLink.isActive) {
        await submissionLink.save();
        return res.status(403).json({
          success: false,
          message: 'This submission link is no longer active'
        });
      }

      // Check if submission limit reached
      if (submissionLink.hasReachedLimit()) {
        await submissionLink.save();
        return res.status(429).json({
          success: false,
          message: 'Maximum number of submissions reached for this link'
        });
      }

      // Validate password
      if (submissionLink.password !== password) {
        await submissionLink.save();
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Update successful access
      submissionLink.usageLog[submissionLink.usageLog.length - 1].success = true;
      await submissionLink.save();

      res.json({
        success: true,
        message: 'Access granted',
        data: {
          title: submissionLink.title,
          description: submissionLink.description,
          allowedCategories: submissionLink.allowedCategories,
          expiresAt: submissionLink.expiresAt,
          remainingSubmissions: submissionLink.maxSubmissions - submissionLink.currentSubmissions
        }
      });
    } catch (error) {
      console.error('Validate submission link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate submission link',
        error: error.message
      });
    }
  }
}

module.exports = SubmissionLinkController;
