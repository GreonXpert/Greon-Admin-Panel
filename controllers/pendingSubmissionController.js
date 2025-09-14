// controllers/pendingSubmissionController.js - COMPLETE FIXED VERSION

const PendingSubmission = require('../models/PendingSubmission');
const SubmissionLink = require('../models/SubmissionLink');
const Story = require('../models/Story');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

class PendingSubmissionController {
  // ✅ FIXED: Submit new story with proper file handling
 // controllers/pendingSubmissionController.js - CRITICAL FIX for submitStory method

static async submitStory(req, res) {
  try {
    console.log('📝 Processing external story submission...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    // Validate submission link
    const submissionLink = await SubmissionLink.findOne({ token });
    if (!submissionLink || submissionLink.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid submission link or password'
      });
    }

    // Check submission link validity
    if (submissionLink.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'This submission link has expired'
      });
    }

    if (!submissionLink.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This submission link is no longer active'
      });
    }

    if (submissionLink.hasReachedLimit()) {
      return res.status(429).json({
        success: false,
        message: 'Maximum number of submissions reached for this link'
      });
    }

    console.log('📁 Processing uploaded files...');
    
    // ✅ CRITICAL FIX: Create proper file objects without JSON.stringify
    const attachments = [];
    const fileFields = {};

    if (req.files && Object.keys(req.files).length > 0) {
      Object.keys(req.files).forEach(fieldName => {
        const filesArray = req.files[fieldName];
        if (filesArray && filesArray.length > 0) {
          const file = filesArray[0];
          
          console.log(`📄 Processing ${fieldName}:`, {
            filename: file.filename,
            originalname: file.originalname,
            size: file.size
          });

          // ✅ Create proper file reference object
          const fileRef = {
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            fieldName: fieldName,
            url: `/uploads/ExternalSubmissions/${
              fieldName === 'image' ? req.body.category :
              fieldName === 'authorImage' ? 'Authors' :
              fieldName === 'file' ? 'Files' : 'General'
            }/${file.filename}`
          };

          // Store in files object
          fileFields[fieldName] = fileRef;

          // ✅ CRITICAL FIX: Create attachment object properly
          const attachmentObj = {
            filename: file.filename,
            originalName: file.originalname,
            path: file.path,
            mimetype: file.mimetype,
            size: file.size,
            fieldName: fieldName,
            type: fieldName === 'image' ? 'main_image' :
                  fieldName === 'authorImage' ? 'author_image' : 'resource_file',
            url: fileRef.url
          };

          attachments.push(attachmentObj);
        }
      });
    }

    // ✅ Verify data types before saving
    console.log('💾 Data type verification:');
    console.log('- attachments type:', typeof attachments);
    console.log('- attachments is array:', Array.isArray(attachments));
    console.log('- files type:', typeof fileFields);
    console.log('- attachments length:', attachments.length);
    console.log('- attachments content:', JSON.stringify(attachments, null, 2));

    // ✅ CRITICAL FIX: Create submission data with proper object references
    const submissionData = {
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      category: req.body.category,
      submitterName: req.body.submitterName,
      submitterEmail: req.body.submitterEmail,
      submitterOrganization: req.body.submitterOrganization || '',

      // Category-specific fields
      ...(req.body.category === 'Blog' && {
        suggestedAuthor: req.body.suggestedAuthor || req.body.submitterName,
        estimatedReadTime: req.body.estimatedReadTime || '5 min read'
      }),

      ...(req.body.category === 'Video' && {
        videoUrl: req.body.videoUrl,
        duration: req.body.duration,
        speakers: Array.isArray(req.body.speakers) ? req.body.speakers :
                 (req.body.speakers ? req.body.speakers.split(',').map(s => s.trim()).filter(Boolean) : [])
      }),

      ...(req.body.category === 'Resources' && {
        resourceType: req.body.resourceType || 'PDF',
        estimatedPages: parseInt(req.body.estimatedPages) || 1,
        resourceIncludes: Array.isArray(req.body.resourceIncludes) ? req.body.resourceIncludes :
                         (req.body.resourceIncludes ? req.body.resourceIncludes.split(',').map(r => r.trim()).filter(Boolean) : [])
      }),

      // Common fields
      suggestedTags: Array.isArray(req.body.suggestedTags) ? req.body.suggestedTags :
                    (req.body.suggestedTags ? req.body.suggestedTags.split(',').map(t => t.trim()).filter(Boolean) : []),
      targetAudience: req.body.targetAudience || 'General',
      urgency: req.body.urgency || 'Medium',

      // ✅ CRITICAL FIX: Store as proper objects, not strings
      files: fileFields,
      attachments: attachments,
      
      // Submission metadata
      submissionLink: submissionLink._id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      submissionDate: new Date(),
      source: 'external_submission_form'
    };

    console.log('💾 Creating pending submission...');
    console.log('📄 Final submission data:', {
      title: submissionData.title,
      attachmentsCount: submissionData.attachments.length,
      filesCount: Object.keys(submissionData.files).length
    });

    // ✅ Create and save the submission with proper validation
    const pendingSubmission = new PendingSubmission(submissionData);
    
    // ✅ Validate before saving
    const validationError = pendingSubmission.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Submission validation failed',
        errors: Object.keys(validationError.errors).map(key => ({
          field: key,
          message: validationError.errors[key].message
        }))
      });
    }

    await pendingSubmission.save();
    console.log('✅ Pending submission created:', pendingSubmission._id);

    // Update submission link counter
    submissionLink.currentSubmissions += 1;
    submissionLink.submissions.push(pendingSubmission._id);
    await submissionLink.save();

    // Emit real-time notification
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-room').emit('pending-submission-created', {
          success: true,
          data: pendingSubmission,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      console.warn('Socket emission failed:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Your submission has been received and is under review',
      data: {
        submissionId: pendingSubmission._id,
        status: pendingSubmission.status,
        estimatedReviewTime: '2-5 business days',
        submissionDate: pendingSubmission.createdAt,
        trackingReference: pendingSubmission._id.toString().slice(-8).toUpperCase(),
        filesUploaded: Object.keys(fileFields)
      }
    });

  } catch (error) {
    console.error('❌ Submit story error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit story',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}


  // ✅ FIXED: Enhanced approval with proper file path handling
  static async approveSubmission(req, res) {
    try {
      const { id } = req.params;
      const { reviewNotes, storyData } = req.body;

      console.log('📋 Approving submission:', id);

      const submission = await PendingSubmission.findById(id);
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      if (submission.status !== 'pending' && submission.status !== 'needs_revision') {
        return res.status(400).json({
          success: false,
          message: 'Only pending or revision-needed submissions can be approved'
        });
      }

      // ✅ Prepare story data with proper file path handling
      const finalStoryData = {
        title: storyData?.title || submission.title,
        description: storyData?.description || submission.description,
        content: storyData?.content || submission.content,
        category: submission.category,
        tags: storyData?.tags || submission.suggestedTags || [],
        featured: storyData?.featured || false,
        status: 'published'
      };

      // Generate unique link
      const baseSlug = submission.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await Story.findOne({ link: uniqueSlug })) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      finalStoryData.link = uniqueSlug;

      // ✅ Handle main image with proper path construction
      if (submission.files?.image?.filename) {
        finalStoryData.image = `/uploads/ExternalSubmissions/${submission.category}/${submission.files.image.filename}`;
        console.log('📸 Using submitted main image:', finalStoryData.image);
      } else if (req.files && req.files.image && req.files.image[0]) {
        const categoryFolder = submission.category.charAt(0).toUpperCase() + submission.category.slice(1).toLowerCase();
        finalStoryData.image = `/uploads/SustainabilityStory/${categoryFolder}/${req.files.image[0].filename}`;
        console.log('📸 Using admin replacement image:', finalStoryData.image);
      } else {
        finalStoryData.image = `/uploads/defaults/${submission.category.toLowerCase()}-default.jpg`;
        console.log('📸 Using default image:', finalStoryData.image);
      }

      // ✅ Category-specific field handling
      if (submission.category === 'Blog') {
        finalStoryData.author = storyData?.author || submission.suggestedAuthor || submission.submitterName;
        finalStoryData.readTime = storyData?.readTime || submission.estimatedReadTime || '5 min read';
        
        if (submission.files?.authorImage?.filename) {
          finalStoryData.authorImage = `/uploads/ExternalSubmissions/Authors/${submission.files.authorImage.filename}`;
          console.log('👤 Using submitted author image:', finalStoryData.authorImage);
        } else {
          finalStoryData.authorImage = `/uploads/defaults/author-default.jpg`;
        }
      }

      if (submission.category === 'Video') {
        if (!submission.videoUrl && !storyData?.videoUrl) {
          return res.status(400).json({
            success: false,
            message: 'Video URL is required for video submissions'
          });
        }
        finalStoryData.videoUrl = storyData?.videoUrl || submission.videoUrl;
        finalStoryData.duration = storyData?.duration || submission.duration || '00:00';
        finalStoryData.speakers = storyData?.speakers || submission.speakers || [];
        finalStoryData.views = '0';
      }

      if (submission.category === 'Resources') {
        finalStoryData.fileType = storyData?.fileType || submission.resourceType || 'PDF';
        finalStoryData.pages = storyData?.pages || submission.estimatedPages || 1;
        finalStoryData.includes = storyData?.includes || submission.resourceIncludes || [];
        finalStoryData.downloadCount = '0';
        
        if (submission.files?.file?.filename) {
          finalStoryData.filePath = `/uploads/ExternalSubmissions/Files/${submission.files.file.filename}`;
          console.log('📄 Using submitted resource file:', finalStoryData.filePath);
          
          if (submission.files.file.size) {
            const fileSizeInMB = (submission.files.file.size / (1024 * 1024)).toFixed(2);
            finalStoryData.fileSize = `${fileSizeInMB} MB`;
          } else {
            finalStoryData.fileSize = 'Unknown';
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'Resource file is required for resource submissions'
          });
        }
      }

      console.log('📝 Creating story with data:', JSON.stringify(finalStoryData, null, 2));

      // ✅ Create the story with validation
      const story = new Story(finalStoryData);
      const validationError = story.validateSync();
      
      if (validationError) {
        console.error('Story validation error:', validationError);
        return res.status(400).json({
          success: false,
          message: 'Story validation failed',
          errors: Object.keys(validationError.errors).map(key => ({
            field: key,
            message: validationError.errors[key].message
          }))
        });
      }

      await story.save();
      console.log('✅ Story created successfully:', story._id);

      // Save submitter email safely
      try {
        await PendingSubmissionController.saveApprovedSubmitterEmail(
          submission.submitterEmail,
          submission.submitterName,
          story._id
        );
      } catch (emailError) {
        console.warn('Failed to save approved submitter email:', emailError.message);
      }

      // Update submission status
      submission.status = 'approved';
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
      submission.reviewNotes = reviewNotes;
      submission.finalStory = story._id;
      submission.approvalSteps.push({
        reviewedBy: req.user._id,
        action: 'approved',
        notes: reviewNotes,
        timestamp: new Date()
      });

      await submission.save();

      // Emit real-time events
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-approved', {
            submission: submission,
            story: story,
            approvedBy: req.user,
            timestamp: new Date()
          });

          io.to('sustainabilityStories').emit('story-created', {
            success: true,
            data: story,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: 'Submission approved and story created successfully',
        data: {
          submission,
          story,
          submitterEmailSaved: true,
          imageUrls: {
            main: finalStoryData.image,
            author: finalStoryData.authorImage || null,
            file: finalStoryData.filePath || null
          }
        }
      });

    } catch (error) {
      console.error('❌ Approve submission error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to approve submission',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // ✅ Get all pending submissions with file URLs
  static async getAllPendingSubmissions(req, res) {
    try {
      const {
        status,
        category,
        page = 1,
        limit = 10,
        sortBy = '-createdAt',
        submissionLink,
        search
      } = req.query;

      const filter = {};
      if (status && status !== 'all') filter.status = status;
      if (category && category !== 'all') filter.category = category;
      if (submissionLink) filter.submissionLink = submissionLink;

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { submitterName: { $regex: search, $options: 'i' } },
          { submitterEmail: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const submissions = await PendingSubmission.find(filter)
        .populate('submissionLink', 'title description')
        .populate('reviewedBy', 'name email role')
        .populate('finalStory', 'title slug')
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await PendingSubmission.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      // ✅ Add full image URLs to each submission
      const submissionsWithImages = submissions.map(submission => ({
        ...submission,
        imageUrls: {
          main: submission.files?.image?.filename ?
            `/uploads/ExternalSubmissions/${submission.category}/${submission.files.image.filename}` : null,
          author: submission.files?.authorImage?.filename ?
            `/uploads/ExternalSubmissions/Authors/${submission.files.authorImage.filename}` : null,
          file: submission.files?.file?.filename ?
            `/uploads/ExternalSubmissions/Files/${submission.files.file.filename}` : null
        }
      }));

      // Get submission statistics
      const stats = await PendingSubmission.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const statusStats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        needs_revision: 0
      };

      stats.forEach(stat => {
        statusStats[stat._id] = stat.count;
      });

      res.json({
        success: true,
        data: {
          submissions: submissionsWithImages,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          },
          statistics: statusStats
        }
      });

    } catch (error) {
      console.error('Get pending submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending submissions',
        error: error.message
      });
    }
  }

  // ✅ Get single pending submission with image URLs
  static async getPendingSubmission(req, res) {
    try {
      const { id } = req.params;

      const submission = await PendingSubmission.findById(id)
        .populate('submissionLink', 'title description allowedCategories')
        .populate('reviewedBy', 'name email role')
        .populate('finalStory', 'title slug')
        .populate({
          path: 'approvalSteps.reviewedBy',
          select: 'name email role'
        })
        .lean();

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      // Add image URLs
      submission.imageUrls = {
        main: submission.files?.image?.filename ?
          `/uploads/ExternalSubmissions/${submission.category}/${submission.files.image.filename}` : null,
        author: submission.files?.authorImage?.filename ?
          `/uploads/ExternalSubmissions/Authors/${submission.files.authorImage.filename}` : null,
        file: submission.files?.file?.filename ?
          `/uploads/ExternalSubmissions/Files/${submission.files.file.filename}` : null
      };

      res.json({
        success: true,
        data: submission
      });

    } catch (error) {
      console.error('Get pending submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch submission',
        error: error.message
      });
    }
  }

  // ✅ Save approved submitter email function
  static async saveApprovedSubmitterEmail(email, name, storyId) {
    try {
      const ApprovedSubmitter = require('../models/ApprovedSubmitter');
      const existingSubmitter = await ApprovedSubmitter.findOne({ email });

      if (existingSubmitter) {
        existingSubmitter.approvedStories.push(storyId);
        existingSubmitter.lastApprovalDate = new Date();
        existingSubmitter.totalApprovals += 1;
        await existingSubmitter.save();
      } else {
        const newSubmitter = new ApprovedSubmitter({
          email,
          name,
          approvedStories: [storyId],
          firstApprovalDate: new Date(),
          lastApprovalDate: new Date(),
          totalApprovals: 1
        });
        await newSubmitter.save();
      }

      console.log('📧 Approved submitter email saved:', email);
    } catch (error) {
      console.warn('Failed to save approved submitter email:', error.message);
    }
  }

  // Other methods remain the same...
  static async rejectSubmission(req, res) {
    try {
      const { id } = req.params;
      const { reviewNotes } = req.body;

      const submission = await PendingSubmission.findById(id);
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      if (submission.status !== 'pending' && submission.status !== 'needs_revision') {
        return res.status(400).json({
          success: false,
          message: 'Only pending or revision-needed submissions can be rejected'
        });
      }

      submission.status = 'rejected';
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
      submission.reviewNotes = reviewNotes;
      submission.approvalSteps.push({
        reviewedBy: req.user._id,
        action: 'rejected',
        notes: reviewNotes,
        timestamp: new Date()
      });

      await submission.save();

      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-rejected', {
            submission: submission,
            rejectedBy: req.user,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: 'Submission rejected successfully',
        data: submission
      });

    } catch (error) {
      console.error('Reject submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject submission',
        error: error.message
      });
    }
  }

  static async requestRevision(req, res) {
    try {
      const { id } = req.params;
      const { revisionRequested, reviewNotes } = req.body;

      const submission = await PendingSubmission.findById(id);
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      if (submission.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending submissions can have revision requested'
        });
      }

      submission.status = 'needs_revision';
      submission.reviewedBy = req.user._id;
      submission.reviewedAt = new Date();
      submission.revisionRequested = revisionRequested;
      submission.reviewNotes = reviewNotes;
      submission.approvalSteps.push({
        reviewedBy: req.user._id,
        action: 'revision_requested',
        notes: revisionRequested,
        timestamp: new Date()
      });

      await submission.save();

      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-revision-requested', {
            submission: submission,
            requestedBy: req.user,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: 'Revision requested successfully',
        data: submission
      });

    } catch (error) {
      console.error('Request revision error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to request revision',
        error: error.message
      });
    }
  }

  static async deleteSubmission(req, res) {
    try {
      const { id } = req.params;

      const submission = await PendingSubmission.findById(id);
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      // Delete associated files
      if (submission.files) {
        Object.values(submission.files).forEach(fileInfo => {
          if (fileInfo && fileInfo.path && fs.existsSync(fileInfo.path)) {
            fs.unlinkSync(fileInfo.path);
            console.log(`🗑️ Deleted file: ${fileInfo.path}`);
          }
        });
      }

      // Legacy attachment cleanup
      if (submission.attachments && submission.attachments.length > 0) {
        submission.attachments.forEach(attachment => {
          if (attachment.path && fs.existsSync(attachment.path)) {
            fs.unlinkSync(attachment.path);
          }
        });
      }

      // Remove from submission link
      await SubmissionLink.findByIdAndUpdate(submission.submissionLink, {
        $pull: { submissions: submission._id },
        $inc: { currentSubmissions: -1 }
      });

      await PendingSubmission.findByIdAndDelete(id);

      try {
        const io = req.app.get('io');
        if (io) {
          io.to('admin-room').emit('submission-deleted', {
            submissionId: id,
            title: submission.title,
            deletedBy: req.user,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: 'Submission deleted successfully'
      });

    } catch (error) {
      console.error('Delete submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete submission',
        error: error.message
      });
    }
  }
}

module.exports = PendingSubmissionController;
