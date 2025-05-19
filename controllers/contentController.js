// controllers/contentController.js - Enhanced Content Management Controller
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

// Create or update content for a section (Enhanced to ensure only one record per section)
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
    
    // Set existing content as inactive (for history tracking)
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

// Enhanced edit function - Updates existing content without creating new version
exports.editContent = async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content data is required'
      });
    }
    
    // Find existing active content for this section
    let existingContent = await Content.findOne({ 
      section, 
      isActive: true 
    });
    
    if (existingContent) {
      // Update existing content
      existingContent.content = content;
      existingContent.updatedBy = req.user.id;
      existingContent.updatedAt = new Date();
      
      const updatedContent = await existingContent.save();
      
      res.status(200).json({
        success: true,
        message: `Content for ${section} edited successfully`,
        data: updatedContent
      });
    } else {
      // Create new content if none exists
      const newContent = await Content.create({
        section,
        content,
        isActive: true,
        createdBy: req.user.id,
        updatedBy: req.user.id
      });
      
      res.status(201).json({
        success: true,
        message: `Content for ${section} created successfully`,
        data: newContent
      });
    }
  } catch (error) {
    console.error(`Edit content for section ${req.params.section} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Enhanced upsert function - Create or replace content (ensures only one record)
exports.upsertContent = async (req, res) => {
  try {
    const { section } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content data is required'
      });
    }
    
    // Use findOneAndUpdate with upsert option
    const upsertedContent = await Content.findOneAndUpdate(
      { section, isActive: true },
      {
        section,
        content,
        updatedBy: req.user.id,
        updatedAt: new Date(),
        // Only set createdBy if creating new document
        ...(await Content.findOne({ section, isActive: true }) ? {} : { createdBy: req.user.id })
      },
      {
        new: true, // Return updated document
        upsert: true, // Create if doesn't exist
        runValidators: true // Run schema validators
      }
    );
    
    const isNew = !await Content.findOne({ 
      section, 
      isActive: true, 
      _id: { $ne: upsertedContent._id } 
    });
    
    res.status(isNew ? 201 : 200).json({
      success: true,
      message: `Content for ${section} ${isNew ? 'created' : 'updated'} successfully`,
      data: upsertedContent
    });
  } catch (error) {
    console.error(`Upsert content for section ${req.params.section} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Bulk edit multiple sections at once
exports.bulkEditContent = async (req, res) => {
  try {
    const { sections } = req.body;
    
    if (!sections || typeof sections !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Sections object is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Valid section names
    const validSections = [
      'hero', 'climateIntelligence', 'trustedLeaders', 
      'precisionInAction', 'regulatoryReporting', 
      'advisoryBoard', 'sustainabilityStories'
    ];
    
    for (const [sectionName, content] of Object.entries(sections)) {
      try {
        if (!validSections.includes(sectionName)) {
          errors.push(`Invalid section: ${sectionName}`);
          continue;
        }
        
        // Find existing content or create new
        let existingContent = await Content.findOne({ 
          section: sectionName, 
          isActive: true 
        });
        
        if (existingContent) {
          // Update existing
          existingContent.content = content;
          existingContent.updatedBy = req.user.id;
          existingContent.updatedAt = new Date();
          
          const updated = await existingContent.save();
          results.push({
            section: sectionName,
            action: 'updated',
            id: updated._id
          });
        } else {
          // Create new
          const newContent = await Content.create({
            section: sectionName,
            content,
            isActive: true,
            createdBy: req.user.id,
            updatedBy: req.user.id
          });
          
          results.push({
            section: sectionName,
            action: 'created',
            id: newContent._id
          });
        }
        
      } catch (error) {
        errors.push(`Error updating ${sectionName}: ${error.message}`);
      }
    }
    
    res.status(200).json({
      success: errors.length === 0,
      message: `Processed ${results.length} sections`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Bulk edit error:', error);
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