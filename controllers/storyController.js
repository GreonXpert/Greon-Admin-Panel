// controllers/storyController.js - COMPLETE FIXED VERSION WITH ENHANCED ARRAY PARSING

const Story = require('../models/Story');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

class StoryController {

  // ✅ ENHANCED: Helper function to normalize tags with deep cleaning
  static normalizeTags(tagsInput) {
    if (!tagsInput) return [];

    // If it's already a proper array, clean and return it
    if (Array.isArray(tagsInput)) {
      return tagsInput
        .filter(Boolean)
        .map(tag => {
          if (typeof tag === 'string') {
            // Deep clean any nested JSON strings or malformed data
            return StoryController.cleanTagString(tag);
          }
          return tag.toString().trim();
        })
        .filter(tag => tag && tag.length > 0);
    }

    // If it's a string, try multiple parsing strategies
    if (typeof tagsInput === 'string') {
      let cleanInput = tagsInput.trim();
      
      // Remove outer quotes if they exist
      if ((cleanInput.startsWith('"') && cleanInput.endsWith('"')) || 
          (cleanInput.startsWith("'") && cleanInput.endsWith("'"))) {
        cleanInput = cleanInput.slice(1, -1);
      }

      // Handle JSON array strings
      if (cleanInput.startsWith('[') && cleanInput.endsWith(']')) {
        try {
          const parsed = JSON.parse(cleanInput);
          if (Array.isArray(parsed)) {
            return StoryController.normalizeTags(parsed); // Recursive call
          }
        } catch (e) {
          // If JSON parse fails, try to extract from malformed JSON
          cleanInput = cleanInput.slice(1, -1); // Remove brackets
        }
      }

      // Handle comma/semicolon/pipe separated values
      if (cleanInput.includes(',') || cleanInput.includes(';') || cleanInput.includes('|')) {
        return cleanInput
          .split(/[,;|]/)
          .map(tag => StoryController.cleanTagString(tag))
          .filter(Boolean);
      }

      // Single tag case
      const cleaned = StoryController.cleanTagString(cleanInput);
      return cleaned ? [cleaned] : [];
    }

    return [];
  }

  // ✅ NEW: Helper function to clean individual tag strings
  static cleanTagString(tagString) {
    if (!tagString || typeof tagString !== 'string') return '';

    let cleaned = tagString;

    // Remove various types of quotes and brackets
    cleaned = cleaned
      .replace(/^[\[\]"'\\]+|[\[\]"'\\]+$/g, '') // Remove leading/trailing brackets and quotes
      .replace(/\\"/g, '"') // Unescape quotes
      .replace(/\\'/g, "'") // Unescape single quotes
      .replace(/^\[?"?'?|"?'?\]?$/g, '') // Remove any remaining brackets/quotes
      .trim();

    // Handle nested JSON-like strings
    if (cleaned.includes('\\"') || cleaned.includes("\\'")) {
      cleaned = cleaned
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/^"(.*)"$/, '$1')
        .replace(/^'(.*)'$/, '$1');
    }

    return cleaned;
  }

  // ✅ ENHANCED: Helper function to parse array fields with better error handling
  static parseArrayField(value, defaultValue = []) {
    if (!value) return defaultValue;

    // If it's already an array, clean it
    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .map(item => {
          if (typeof item === 'string') {
            return StoryController.cleanTagString(item);
          }
          return item.toString().trim();
        })
        .filter(item => item && item.length > 0);
    }

    // If it's a string, try to parse it
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Handle empty or null-like strings
      if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[]' || trimmed === '""') {
        return defaultValue;
      }

      try {
        // Try JSON parsing first
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return StoryController.parseArrayField(parsed, defaultValue); // Recursive call
        }
        // If parsed result is not an array, treat as single item
        const cleaned = StoryController.cleanTagString(parsed.toString());
        return cleaned ? [cleaned] : defaultValue;
      } catch (e) {
        // If JSON parse fails, try comma separation
        if (trimmed.includes(',')) {
          return trimmed
            .split(',')
            .map(item => StoryController.cleanTagString(item))
            .filter(Boolean);
        }
        // Single item case
        const cleaned = StoryController.cleanTagString(trimmed);
        return cleaned ? [cleaned] : defaultValue;
      }
    }

    return defaultValue;
  }

  // ✅ ENHANCED: Helper function to parse analytics object
  static parseAnalytics(value) {
    const defaultAnalytics = { impressions: 0, clicks: 0, shares: 0, engagementRate: 0 };
    
    if (!value) return defaultAnalytics;
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      return {
        impressions: parseInt(value.impressions) || 0,
        clicks: parseInt(value.clicks) || 0,
        shares: parseInt(value.shares) || 0,
        engagementRate: parseFloat(value.engagementRate) || 0
      };
    }
    
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return {
          impressions: parseInt(parsed.impressions) || 0,
          clicks: parseInt(parsed.clicks) || 0,
          shares: parseInt(parsed.shares) || 0,
          engagementRate: parseFloat(parsed.engagementRate) || 0
        };
      } catch (e) {
        return defaultAnalytics;
      }
    }
    
    return defaultAnalytics;
  }

  // ✅ ENHANCED: Helper function to sanitize update data
  static sanitizeUpdateData(data) {
    const sanitized = { ...data };

    // Parse array fields that might come as strings
    if ('comments' in sanitized) {
      sanitized.comments = StoryController.parseArrayField(sanitized.comments, []);
    }

    // ✅ Use enhanced normalizeTags function
    if ('tags' in sanitized) {
      sanitized.tags = StoryController.normalizeTags(sanitized.tags);
    }

    if ('includes' in sanitized) {
      sanitized.includes = StoryController.parseArrayField(sanitized.includes, []);
    }

    if ('speakers' in sanitized) {
      sanitized.speakers = StoryController.parseArrayField(sanitized.speakers, []);
    }

    // Parse analytics object
    if ('analytics' in sanitized) {
      sanitized.analytics = StoryController.parseAnalytics(sanitized.analytics);
    }

    // Remove any undefined or null values that might cause issues
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === 'undefined' || sanitized[key] === 'null') {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  // ✅ ENHANCED: Additional data cleaning before saving
  static cleanStoryData(storyData) {
    // Ensure all array fields are properly formatted
    if (storyData.tags) {
      storyData.tags = StoryController.normalizeTags(storyData.tags);
    }

    if (storyData.speakers) {
      storyData.speakers = StoryController.parseArrayField(storyData.speakers, []);
    }

    if (storyData.includes) {
      storyData.includes = StoryController.parseArrayField(storyData.includes, []);
    }

    if (storyData.comments) {
      storyData.comments = StoryController.parseArrayField(storyData.comments, []);
    }

    return storyData;
  }

  // Get all stories with filtering and pagination
  static async getAllStories(req, res) {
    try {
      const {
        category,
        featured,
        status = 'published',
        page = 1,
        limit = 10,
        sort = '-createdAt',
        search
      } = req.query;

      // Build filter object
      const filter = { status };
      if (category && category !== 'all') {
        filter.category = category;
      }
      if (featured !== undefined) {
        filter.featured = featured === 'true';
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const stories = await Story.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Story.countDocuments(filter);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          stories,
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
      console.error('Get all stories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stories',
        error: error.message
      });
    }
  }

  // Get single story by ID or slug
  static async getStoryById(req, res) {
    try {
      const { id } = req.params;
      
      const story = await Story.findOne({
        $or: [{ _id: id }, { slug: id }],
        status: 'published'
      }).lean();

      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Story not found'
        });
      }

      // Increment view/impression analytics safely
      try {
        await Story.findByIdAndUpdate(story._id, {
          $inc: { 'analytics.impressions': 1 }
        });
      } catch (analyticsError) {
        console.warn('Analytics update failed:', analyticsError.message);
      }

      // Emit real-time view event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-viewed', {
            storyId: story._id,
            title: story.title,
            category: story.category,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        data: story
      });
    } catch (error) {
      console.error('Get story by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch story',
        error: error.message
      });
    }
  }

  // ✅ ENHANCED: Create new story with comprehensive data cleaning
  static async createStory(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      // Enhanced sanitization and cleaning
      let storyData = StoryController.sanitizeUpdateData(req.body);
      storyData = StoryController.cleanStoryData(storyData);

      // Handle file uploads
      if (req.files && req.files.image && req.files.image[0]) {
        const category = req.body.category || 'Blog';
        const categoryFolder = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        storyData.image = `/uploads/SustainabilityStory/${categoryFolder}/${req.files.image[0].filename}`;
      }

      if (req.files && req.files.authorImage && req.files.authorImage[0]) {
        storyData.authorImage = `/uploads/SustainabilityStory/Authors/${req.files.authorImage[0].filename}`;
      }

      if (req.files && req.files.file && req.files.file[0]) {
        storyData.filePath = `/uploads/SustainabilityStory/Files/${req.files.file[0].filename}`;
        
        const fileExtension = path.extname(req.files.file[0].originalname).toLowerCase();
        switch (fileExtension) {
          case '.pdf':
            storyData.fileType = 'PDF';
            break;
          case '.xls':
          case '.xlsx':
            storyData.fileType = 'Excel';
            break;
          case '.doc':
          case '.docx':
            storyData.fileType = 'Word';
            break;
          case '.ppt':
          case '.pptx':
            storyData.fileType = 'PowerPoint';
            break;
          default:
            storyData.fileType = 'PDF';
        }

        const fileSizeInBytes = req.files.file[0].size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        storyData.fileSize = `${fileSizeInMB} MB`;
      }

      // Ensure analytics object is properly initialized
      if (!storyData.analytics) {
        storyData.analytics = { impressions: 0, clicks: 0, shares: 0, engagementRate: 0 };
      }

      console.log('Creating story with cleaned data:', {
        title: storyData.title,
        tags: storyData.tags,
        speakers: storyData.speakers,
        includes: storyData.includes
      });

      const story = new Story(storyData);
      await story.save();

      // Emit real-time creation event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-created', {
            success: true,
            data: story,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Story created successfully',
        data: story
      });
    } catch (error) {
      console.error('Create story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create story',
        error: error.message
      });
    }
  }

  // ✅ ENHANCED: Update story with comprehensive data cleaning
  static async updateStory(req, res) {
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

      // Enhanced sanitization and cleaning
      let updateData = StoryController.sanitizeUpdateData({
        ...req.body, 
        updatedAt: new Date()
      });
      updateData = StoryController.cleanStoryData(updateData);

      // Handle file uploads
      if (req.files && req.files.image && req.files.image[0]) {
        const category = req.body.category || 'Blog';
        const categoryFolder = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        updateData.image = `/uploads/SustainabilityStory/${categoryFolder}/${req.files.image[0].filename}`;
      }

      if (req.files && req.files.authorImage && req.files.authorImage[0]) {
        updateData.authorImage = `/uploads/SustainabilityStory/Authors/${req.files.authorImage[0].filename}`;
      }

      if (req.files && req.files.file && req.files.file[0]) {
        updateData.filePath = `/uploads/SustainabilityStory/Files/${req.files.file[0].filename}`;
        
        const fileExtension = path.extname(req.files.file[0].originalname).toLowerCase();
        switch (fileExtension) {
          case '.pdf':
            updateData.fileType = 'PDF';
            break;
          case '.xls':
          case '.xlsx':
            updateData.fileType = 'Excel';
            break;
          case '.doc':
          case '.docx':
            updateData.fileType = 'Word';
            break;
          case '.ppt':
          case '.pptx':
            updateData.fileType = 'PowerPoint';
            break;
          default:
            updateData.fileType = 'PDF';
        }

        const fileSizeInBytes = req.files.file[0].size;
        const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
        updateData.fileSize = `${fileSizeInMB} MB`;
      }

      console.log('Updating story with cleaned data:', {
        id,
        tags: updateData.tags,
        speakers: updateData.speakers,
        includes: updateData.includes
      });

      const story = await Story.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Story not found'
        });
      }

      // Emit real-time update event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-updated', {
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
        message: 'Story updated successfully',
        data: story
      });
    } catch (error) {
      console.error('Update story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update story',
        error: error.message
      });
    }
  }

  // Delete story
  static async deleteStory(req, res) {
    try {
      const { id } = req.params;
      
      const story = await Story.findByIdAndDelete(id);
      
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Story not found'
        });
      }

      // Delete associated files
      if (story.image) {
        const imagePath = path.join(__dirname, '..', story.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      if (story.authorImage) {
        const authorImagePath = path.join(__dirname, '..', story.authorImage);
        if (fs.existsSync(authorImagePath)) {
          fs.unlinkSync(authorImagePath);
        }
      }

      if (story.filePath) {
        const filePath = path.join(__dirname, '..', story.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Emit real-time deletion event
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-deleted', {
            storyId: id,
            title: story.title,
            category: story.category,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: 'Story deleted successfully'
      });
    } catch (error) {
      console.error('Delete story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete story',
        error: error.message
      });
    }
  }

  // Get featured stories
  static async getFeaturedStories(req, res) {
    try {
      const stories = await Story.getFeatured();
      res.json({
        success: true,
        data: stories
      });
    } catch (error) {
      console.error('Get featured stories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch featured stories',
        error: error.message
      });
    }
  }

  // Get trending stories
  static async getTrendingStories(req, res) {
    try {
      const stories = await Story.getTrending();
      res.json({
        success: true,
        data: stories
      });
    } catch (error) {
      console.error('Get trending stories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending stories',
        error: error.message
      });
    }
  }

  // ✅ ENHANCED: Track engagement with comprehensive error handling
  static async trackEngagement(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      
      console.log(`Tracking engagement: ${action} for story ${id}`);
      
      const story = await Story.findById(id);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Story not found'
        });
      }

      let updatedStory;
      
      switch (action) {
        case 'like':
          updatedStory = await Story.findByIdAndUpdate(
            id,
            { 
              $inc: { 
                likes: 1, 
                'analytics.engagementRate': 0.1 
              } 
            },
            { new: true }
          );
          break;
          
        case 'share':
          updatedStory = await Story.findByIdAndUpdate(
            id,
            { 
              $inc: { 
                'analytics.shares': 1, 
                'analytics.engagementRate': 0.2 
              } 
            },
            { new: true }
          );
          break;
          
        case 'download':
          if (story.category === 'Resources') {
            updatedStory = await story.incrementDownloads();
          } else {
            updatedStory = story;
          }
          break;
          
        case 'view':
          if (story.category === 'Video') {
            updatedStory = await story.incrementViews();
          } else {
            // For blog posts, just increment impressions
            updatedStory = await Story.findByIdAndUpdate(
              id,
              { $inc: { 'analytics.impressions': 1 } },
              { new: true }
            );
          }
          break;
          
        case 'click':
          updatedStory = await Story.findByIdAndUpdate(
            id,
            { $inc: { 'analytics.clicks': 1 } },
            { new: true }
          );
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action type'
          });
      }

      // Emit real-time engagement update
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-engagement', {
            storyId: id,
            action,
            category: updatedStory.category,
            likes: updatedStory.likes,
            views: updatedStory.views,
            downloadCount: updatedStory.downloadCount,
            analytics: updatedStory.analytics,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.json({
        success: true,
        message: `${action} tracked successfully`,
        data: {
          likes: updatedStory.likes,
          views: updatedStory.views,
          downloadCount: updatedStory.downloadCount,
          analytics: updatedStory.analytics
        }
      });
      
    } catch (error) {
      console.error('Track engagement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track engagement',
        error: error.message
      });
    }
  }

  // Add comment to story
  static async addComment(req, res) {
    try {
      const { id } = req.params;
      const { user, message } = req.body;

      const story = await Story.findByIdAndUpdate(
        id,
        {
          $push: {
            comments: {
              user,
              message,
              date: new Date()
            }
          },
          $inc: { 'analytics.engagementRate': 0.3 }
        },
        { new: true }
      );

      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Story not found'
        });
      }

      const newComment = story.comments[story.comments.length - 1];

      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-comment', {
            storyId: id,
            comment: newComment,
            storyTitle: story.title,
            category: story.category,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: newComment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add comment',
        error: error.message
      });
    }
  }

  // Download story file
  static async downloadStoryFile(req, res) {
    try {
      const { id } = req.params;
      
      const story = await Story.findById(id);
      
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Story not found'
        });
      }

      if (!story.filePath) {
        return res.status(404).json({
          success: false,
          message: 'File not found for this story'
        });
      }

      const filePath = path.join(__dirname, '..', story.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      await story.incrementDownloads();

      try {
        const io = req.app.get('io');
        if (io) {
          io.to('sustainabilityStories').emit('story-download', {
            storyId: story._id,
            title: story.title,
            category: story.category,
            downloadCount: story.downloadCount,
            timestamp: new Date()
          });
        }
      } catch (socketError) {
        console.warn('Socket emission failed:', socketError.message);
      }

      const fileName = path.basename(story.filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      const fileExtension = path.extname(fileName).toLowerCase();
      switch (fileExtension) {
        case '.pdf':
          res.setHeader('Content-Type', 'application/pdf');
          break;
        case '.xls':
          res.setHeader('Content-Type', 'application/vnd.ms-excel');
          break;
        case '.xlsx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;
        case '.doc':
          res.setHeader('Content-Type', 'application/msword');
          break;
        case '.docx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          break;
        case '.ppt':
          res.setHeader('Content-Type', 'application/vnd.ms-powerpoint');
          break;
        case '.pptx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          break;
        default:
          res.setHeader('Content-Type', 'application/octet-stream');
      }

      res.download(filePath, fileName);
      
    } catch (error) {
      console.error('Download story file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download file',
        error: error.message
      });
    }
  }

  // Get analytics
  static async getAnalytics(req, res) {
    try {
      const totalStories = await Story.countDocuments({ status: 'published' });
      const totalViews = await Story.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, total: { $sum: '$analytics.impressions' } } }
      ]);
      
      const categoryStats = await Story.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);

      const topStories = await Story.find({ status: 'published' })
        .sort({ 'analytics.impressions': -1 })
        .limit(5)
        .select('title analytics category');

      res.json({
        success: true,
        data: {
          totalStories,
          totalViews: totalViews[0]?.total || 0,
          categoryStats,
          topStories
        }
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }
}

module.exports = StoryController;
