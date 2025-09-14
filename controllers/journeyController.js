// controllers/journeyController.js
const mongoose = require('mongoose');
const Journey = require('../models/journey');
const fs = require('fs');
const path = require('path');

// Helper function to normalize array fields
function normalizeArrayField(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean).map(String);
  
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch (_) {}
  
  return String(input)
    .split(/\r?\n|,/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ✅ NEW: Helper function to delete files from filesystem
function deleteFileIfExists(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted file: ${filePath}`);
    } else {
      console.log(`ℹ️ File not found, skipping: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error deleting file ${filePath}:`, error);
  }
}

// ✅ NEW: Helper function to delete multiple files
function deleteFiles(filePaths) {
  if (!Array.isArray(filePaths)) return;
  filePaths.forEach(filePath => {
    if (filePath && typeof filePath === 'string') {
      deleteFileIfExists(filePath);
    }
  });
}

// ✅ NEW: Helper function to process file groups
function processFilesByFieldname(files) {
  const result = {
    images: [],
    logoImages: []
  };
  
  if (!files || typeof files !== 'object') return result;
  
  if (files.images) {
    result.images = Array.isArray(files.images) ? files.images : [files.images];
  }
  
  if (files.logoImages) {
    result.logoImages = Array.isArray(files.logoImages) ? files.logoImages : [files.logoImages];
  }
  
  return result;
}

// @desc Get all journey milestones
// @route GET /api/journey
// @access Public
exports.getAllJourney = async (req, res) => {
  try {
    const { status = 'published' } = req.query;
    const query = status === 'all' ? {} : { status };
    
    const journeyData = await Journey.find(query)
      .sort({ displayOrder: 1, year: 1 });
    
    res.json({ 
      success: true, 
      count: journeyData.length,
      data: journeyData 
    });
  } catch (error) {
    console.error('getAllJourney error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc Get single journey milestone by ID
// @route GET /api/journey/:id
// @access Public
exports.getJourneyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid journey ID' 
      });
    }
    
    const journey = await Journey.findById(id);
    
    if (!journey) {
      return res.status(404).json({ 
        success: false, 
        message: 'Journey milestone not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: journey 
    });
  } catch (error) {
    console.error('getJourneyById error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc Add new journey milestone
// @route POST /api/journey
// @access Private
exports.addJourney = async (req, res) => {
  try {
    const {
      year, title, subtitle, bio, summary, description,
      color, secondaryColor, icon, side, status = 'published',
      displayOrder = 0
    } = req.body;
    
    // Validate required fields
    if (!year || !title || !subtitle || !bio || !summary || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: year, title, subtitle, bio, summary, description'
      });
    }
    
    if (!color || !secondaryColor || !icon || !side) {
      return res.status(400).json({
        success: false,
        message: 'Please provide color, secondaryColor, icon, and side'
      });
    }
    
    // Process files by fieldname
    const fileGroups = processFilesByFieldname(req.files);
    
    // Check if at least one main image was uploaded
    if (fileGroups.images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one main image'
      });
    }
    
    // Process main images (up to 4)
    const images = fileGroups.images.slice(0, 4).map((file, index) => ({
      url: `/uploads/Journey/${file.filename}`,
      caption: req.body[`imageCaption${index}`] || '',
      isPrimary: index === 0
    }));
    
    // Process logo images (up to 10)
    const logoImages = fileGroups.logoImages.slice(0, 10).map((file, index) => ({
      url: `/uploads/Journey/logos/${file.filename}`,
      caption: req.body[`logoCaption${index}`] || '',
      altText: req.body[`logoAltText${index}`] || ''
    }));
    
    // Set primary image URL
    const imageUrl = images[0].url;
    
    // Normalize array fields
    const achievements = normalizeArrayField(req.body.achievements);
    const highlights = normalizeArrayField(req.body.highlights);
    const badges = normalizeArrayField(req.body.badges);
    const partners = normalizeArrayField(req.body.partners);
    const platforms = normalizeArrayField(req.body.platforms);
    const products = normalizeArrayField(req.body.products);
    const sectors = normalizeArrayField(req.body.sectors);
    const logos = normalizeArrayField(req.body.logos);
    
    // Create new journey milestone
    const journey = new Journey({
      year,
      title,
      subtitle,
      bio,
      summary,
      description,
      achievements,
      highlights,
      images,
      logoImages,
      imageUrl,
      color,
      secondaryColor,
      icon,
      side,
      badges,
      partners,
      platforms,
      products,
      sectors,
      logos,
      status,
      displayOrder: parseInt(displayOrder) || 0
    });
    
    await journey.save();
    
    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const allJourney = await Journey.find({ status: 'published' })
        .sort({ displayOrder: 1, year: 1 });
      
      io.to('journey').emit('journey-updated', {
        success: true,
        data: allJourney,
        newRecord: journey,
        action: 'created',
        timestamp: new Date().toISOString()
      });
      
      io.to('journey-admin').emit('journey-admin-updated', {
        success: true,
        data: await Journey.find().sort({ displayOrder: 1, year: 1 }),
        newRecord: journey,
        action: 'created',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Journey milestone created: ${journey.year} - ${journey.title}`);
    }
    
    res.status(201).json({ 
      success: true, 
      data: journey 
    });
    
  } catch (error) {
    console.error('addJourney error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Journey milestone for this year already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc Update journey milestone  
// @route PUT /api/journey/:id
// @access Private
exports.updateJourney = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid journey ID' 
      });
    }
    
    const existingJourney = await Journey.findById(id);
    if (!existingJourney) {
      return res.status(404).json({ 
        success: false, 
        message: 'Journey milestone not found' 
      });
    }
    
    // Build update object
    const updates = {};
    
    // Handle text fields
    ['year', 'title', 'subtitle', 'bio', 'summary', 'description', 
     'color', 'secondaryColor', 'icon', 'side', 'status', 'displayOrder'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // Handle array fields
    ['achievements', 'highlights', 'badges', 'partners', 
     'platforms', 'products', 'sectors', 'logos'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = normalizeArrayField(req.body[field]);
      }
    });
    
    // ✅ NEW: Handle removed images (delete files from disk)
    if (req.body.removedImages) {
      try {
        const removedImages = JSON.parse(req.body.removedImages);
        if (Array.isArray(removedImages) && removedImages.length > 0) {
          console.log('🗑️ Removing images:', removedImages);
          deleteFiles(removedImages);
        }
      } catch (e) {
        console.error('Error parsing removedImages:', e);
      }
    }
    
    // ✅ NEW: Handle removed logo images (delete files from disk)
    if (req.body.removedLogoImages) {
      try {
        const removedLogoImages = JSON.parse(req.body.removedLogoImages);
        if (Array.isArray(removedLogoImages) && removedLogoImages.length > 0) {
          console.log('🗑️ Removing logo images:', removedLogoImages);
          deleteFiles(removedLogoImages);
        }
      } catch (e) {
        console.error('Error parsing removedLogoImages:', e);
      }
    }
    
    // ✅ UPDATED: Handle new image uploads and remaining images
    const fileGroups = processFilesByFieldname(req.files);
    
    // Handle main images
    if (req.body.keepExistingImages || fileGroups.images.length > 0) {
      let finalImages = [];
      
      // Add existing images that weren't removed
      if (req.body.keepExistingImages) {
        try {
          const existingImages = JSON.parse(req.body.keepExistingImages);
          if (Array.isArray(existingImages)) {
            finalImages = [...existingImages];
          }
        } catch (e) {
          console.error('Error parsing keepExistingImages:', e);
        }
      }
      
      // Add new uploaded images
      if (fileGroups.images.length > 0) {
        const newImages = fileGroups.images.slice(0, 4).map((file, index) => ({
          url: `/uploads/Journey/${file.filename}`,
          caption: req.body[`imageCaption${index}`] || '',
          isPrimary: finalImages.length === 0 && index === 0 // First image is primary if no existing images
        }));
        finalImages = [...finalImages, ...newImages];
      }
      
      // Ensure we don't exceed 4 images
      finalImages = finalImages.slice(0, 4);
      
      // Set primary image if none exists
      if (finalImages.length > 0 && !finalImages.some(img => img.isPrimary)) {
        finalImages[0].isPrimary = true;
      }
      
      updates.images = finalImages;
      if (finalImages.length > 0) {
        updates.imageUrl = finalImages.find(img => img.isPrimary)?.url || finalImages[0].url;
      }
    }
    
    // Handle logo images
    if (req.body.keepExistingLogoImages || fileGroups.logoImages.length > 0) {
      let finalLogoImages = [];
      
      // Add existing logo images that weren't removed
      if (req.body.keepExistingLogoImages) {
        try {
          const existingLogoImages = JSON.parse(req.body.keepExistingLogoImages);
          if (Array.isArray(existingLogoImages)) {
            finalLogoImages = [...existingLogoImages];
          }
        } catch (e) {
          console.error('Error parsing keepExistingLogoImages:', e);
        }
      }
      
      // Add new uploaded logo images
      if (fileGroups.logoImages.length > 0) {
        const newLogoImages = fileGroups.logoImages.slice(0, 10).map((file, index) => ({
          url: `/uploads/Journey/logos/${file.filename}`,
          caption: req.body[`logoCaption${index}`] || '',
          altText: req.body[`logoAltText${index}`] || ''
        }));
        finalLogoImages = [...finalLogoImages, ...newLogoImages];
      }
      
      // Ensure we don't exceed 10 logo images
      finalLogoImages = finalLogoImages.slice(0, 10);
      
      updates.logoImages = finalLogoImages;
    }
    
    const updatedJourney = await Journey.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allJourney = await Journey.find({ status: 'published' })
        .sort({ displayOrder: 1, year: 1 });
      
      io.to('journey').emit('journey-updated', {
        success: true,
        data: allJourney,
        updatedRecord: updatedJourney,
        action: 'updated',
        timestamp: new Date().toISOString()
      });
      
      io.to('journey-admin').emit('journey-admin-updated', {
        success: true,
        data: await Journey.find().sort({ displayOrder: 1, year: 1 }),
        updatedRecord: updatedJourney,
        action: 'updated',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Journey milestone updated: ${updatedJourney.year} - ${updatedJourney.title}`);
    }
    
    res.json({ 
      success: true, 
      data: updatedJourney 
    });
    
  } catch (error) {
    console.error('updateJourney error:', error);
    
    
    
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc Delete journey milestone
// @route DELETE /api/journey/:id
// @access Private
exports.deleteJourney = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid journey ID' 
      });
    }
    
    const journeyToDelete = await Journey.findById(id);
    
    if (!journeyToDelete) {
      return res.status(404).json({ 
        success: false, 
        message: 'Journey milestone not found' 
      });
    }
    
    // ✅ NEW: Delete all associated files before deleting the record
    const filesToDelete = [];
    
    // Add main images to deletion list
    if (journeyToDelete.images && journeyToDelete.images.length > 0) {
      journeyToDelete.images.forEach(image => {
        if (image.url) {
          filesToDelete.push(image.url);
        }
      });
    }
    
    // Add logo images to deletion list
    if (journeyToDelete.logoImages && journeyToDelete.logoImages.length > 0) {
      journeyToDelete.logoImages.forEach(logoImage => {
        if (logoImage.url) {
          filesToDelete.push(logoImage.url);
        }
      });
    }
    
    // Delete all files from filesystem
    if (filesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${filesToDelete.length} files for journey: ${journeyToDelete.title}`);
      deleteFiles(filesToDelete);
    }
    
    // Now delete the record from database
    const deletedJourney = await Journey.findByIdAndDelete(id);
    
    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allJourney = await Journey.find({ status: 'published' })
        .sort({ displayOrder: 1, year: 1 });
      
      io.to('journey').emit('journey-updated', {
        success: true,
        data: allJourney,
        deletedRecord: deletedJourney,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });
      
      io.to('journey-admin').emit('journey-admin-updated', {
        success: true,
        data: await Journey.find().sort({ displayOrder: 1, year: 1 }),
        deletedRecord: deletedJourney,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Journey milestone deleted: ${deletedJourney.year} - ${deletedJourney.title}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Journey milestone and associated files deleted successfully' 
    });
    
  } catch (error) {
    console.error('deleteJourney error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};

// @desc Update display order of journey milestones
// @route PUT /api/journey/reorder
// @access Private
exports.reorderJourney = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderedIds as an array'
      });
    }
    
    const updatePromises = orderedIds.map((id, index) =>
      Journey.findByIdAndUpdate(id, { displayOrder: index })
    );
    
    await Promise.all(updatePromises);
    
    const reorderedJourney = await Journey.find({ status: 'published' })
      .sort({ displayOrder: 1, year: 1 });
    
    const io = req.app.get('io');
    if (io) {
      io.to('journey').emit('journey-updated', {
        success: true,
        data: reorderedJourney,
        action: 'reordered',
        timestamp: new Date().toISOString()
      });
      
      io.to('journey-admin').emit('journey-admin-updated', {
        success: true,
        data: await Journey.find().sort({ displayOrder: 1, year: 1 }),
        action: 'reordered',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: reorderedJourney
    });
  } catch (error) {
    console.error('reorderJourney error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
};
