// controllers/contentController.js - Content Management Controller
const Content = require('../models/Content');

// Get all content sections
exports.getAllContent = async (req, res) => {
  try {
    // Only return active content by default
    const contents = await Content.find({ isActive: true })
      .select('-__v')
      .sort({ section: 1 });
    
    res.status(200).json({
      success: true,
      count: contents.length,
      data: contents
    });
  } catch (error) {
    console.error('Get all content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get content by section
exports.getContentBySection = async (req, res) => {
  try {
    const { section } = req.params;
    
    const content = await Content.findOne({ 
      section, 
      isActive: true 
    }).select('-__v');
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: `No content found for section ${section}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error(`Get content for section ${req.params.section} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create or update content for a section
exports.updateContent = async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content data is required'
      });
    }
    
    // Set existing content as inactive
    await Content.updateMany(
      { section, isActive: true },
      { isActive: false }
    );
    
    // Create new content version
    const newContent = await Content.create({
      section,
      content,
      isActive: true,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: `Content for ${section} updated successfully`,
      data: newContent
    });
  } catch (error) {
    console.error(`Update content for section ${req.params.section} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete content by section (mark as inactive)
exports.deleteContent = async (req, res) => {
  try {
    const { section } = req.params;
    
    // Mark existing content as inactive
    const result = await Content.updateMany(
      { section, isActive: true },
      { isActive: false, updatedBy: req.user.id }
    );
    
    if (result.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: `No active content found for section ${section}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Content for ${section} deleted successfully`
    });
  } catch (error) {
    console.error(`Delete content for section ${req.params.section} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get content history for a section
exports.getContentHistory = async (req, res) => {
  try {
    const { section } = req.params;
    
    const history = await Content.find({ section })
      .select('-__v')
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No content history found for section ${section}`
      });
    }
    
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error(`Get history for section ${req.params.section} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Restore a previous content version
exports.restoreContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    
    // Find the content to restore
    const contentToRestore = await Content.findById(contentId);
    
    if (!contentToRestore) {
      return res.status(404).json({
        success: false,
        message: 'Content version not found'
      });
    }
    
    // Deactivate current active version
    await Content.updateMany(
      { section: contentToRestore.section, isActive: true },
      { isActive: false }
    );
    
    // Create a new version based on the old one
    const newContent = await Content.create({
      section: contentToRestore.section,
      content: contentToRestore.content,
      isActive: true,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: `Content for ${contentToRestore.section} restored successfully`,
      data: newContent
    });
  } catch (error) {
    console.error(`Restore content error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};