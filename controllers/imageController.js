// controllers/imageController.js - Image Management Controller
const Image = require('../models/Image');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper function to generate unique filename
const generateFilename = (originalname, mimetype) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = mimetype.split('/')[1];
  return `${timestamp}_${randomString}.${extension}`;
};

// Helper function to save base64 image
const saveBase64Image = (base64Data, category, filename) => {
  try {
    // Remove data:image/jpeg;base64, prefix if present
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Create buffer from base64
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Create file path
    const uploadDir = path.join(__dirname, '..', 'uploads', category);
    const filePath = path.join(uploadDir, filename);
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, imageBuffer);
    
    return {
      success: true,
      filePath,
      size: imageBuffer.length
    };
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload image (supports both file upload and base64)
exports.uploadImage = async (req, res) => {
  try {
    const { 
      category = 'general', 
      purpose = 'general_image',
      altText = '',
      description = '',
      entityId = null,
      base64Image = null,
      originalName = 'uploaded_image'
    } = req.body;
    
    let filename, mimetype, size, filePath;
    
    if (base64Image) {
      // Handle base64 upload
      // Detect mimetype from base64 header
      const mimeMatch = base64Image.match(/^data:image\/([a-z]+);base64,/);
      if (!mimeMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 image format'
        });
      }
      
      mimetype = `image/${mimeMatch[1]}`;
      filename = generateFilename(originalName, mimetype);
      
      const saveResult = saveBase64Image(base64Image, category, filename);
      
      if (!saveResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save image',
          error: saveResult.error
        });
      }
      
      size = saveResult.size;
      filePath = saveResult.filePath;
    } else if (req.file) {
      // Handle multipart file upload
      filename = generateFilename(req.file.originalname, req.file.mimetype);
      mimetype = req.file.mimetype;
      size = req.file.size;
      
      // Move uploaded file to appropriate directory
      const uploadDir = path.join(__dirname, '..', 'uploads', category);
      filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      fs.renameSync(req.file.path, filePath);
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }
    
    // Create image record in database
    const url = `/uploads/${category}/${filename}`;
    
    const image = await Image.create({
      originalName: originalName,
      filename,
      category,
      purpose,
      mimetype,
      size,
      altText,
      description,
      entityId,
      url,
      uploadedBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: image
    });
  } catch (error) {
    console.error('Upload image error:', error);
    
    // Clean up file if database save failed
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all images with optional filters
exports.getAllImages = async (req, res) => {
  try {
    const { 
      category, 
      purpose, 
      entityId,
      page = 1, 
      limit = 50,
      search 
    } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (purpose) filter.purpose = purpose;
    if (entityId) filter.entityId = entityId;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { altText: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get images with pagination
    const images = await Image.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name email')
      .select('-__v');
    
    // Get total count for pagination info
    const total = await Image.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: images,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get images by category
exports.getImagesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { purpose } = req.query;
    
    const filter = { category, isActive: true };
    if (purpose) filter.purpose = purpose;
    
    const images = await Image.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .select('-__v');
    
    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error(`Get images for category ${req.params.category} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get single image by ID
exports.getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const image = await Image.findById(id)
      .populate('uploadedBy', 'name email')
      .select('-__v');
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error(`Get image ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update image metadata
exports.updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { altText, description, purpose, entityId } = req.body;
    
    const image = await Image.findById(id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Update fields
    if (altText !== undefined) image.altText = altText;
    if (description !== undefined) image.description = description;
    if (purpose !== undefined) image.purpose = purpose;
    if (entityId !== undefined) image.entityId = entityId;
    
    const updatedImage = await image.save();
    
    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: updatedImage
    });
  } catch (error) {
    console.error(`Update image ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { forceDelete = false } = req.query;
    
    const image = await Image.findById(id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    if (forceDelete === 'true') {
      // Permanently delete file and database record
      const filePath = path.join(__dirname, '..', 'uploads', image.category, image.filename);
      
      // Delete file from filesystem
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete from database
      await Image.findByIdAndDelete(id);
      
      res.status(200).json({
        success: true,
        message: 'Image permanently deleted'
      });
    } else {
      // Soft delete (mark as inactive)
      image.isActive = false;
      await image.save();
      
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    }
  } catch (error) {
    console.error(`Delete image ${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Replace image (upload new image and update record)
exports.replaceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { base64Image, originalName } = req.body;
    
    const existingImage = await Image.findById(id);
    
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    let filename, mimetype, size, filePath;
    
    if (base64Image) {
      // Handle base64 upload
      const mimeMatch = base64Image.match(/^data:image\/([a-z]+);base64,/);
      if (!mimeMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 image format'
        });
      }
      
      mimetype = `image/${mimeMatch[1]}`;
      filename = generateFilename(originalName || existingImage.originalName, mimetype);
      
      const saveResult = saveBase64Image(base64Image, existingImage.category, filename);
      
      if (!saveResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save image',
          error: saveResult.error
        });
      }
      
      size = saveResult.size;
      filePath = saveResult.filePath;
    } else if (req.file) {
      // Handle file upload
      filename = generateFilename(req.file.originalname, req.file.mimetype);
      mimetype = req.file.mimetype;
      size = req.file.size;
      
      const uploadDir = path.join(__dirname, '..', 'uploads', existingImage.category);
      filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      fs.renameSync(req.file.path, filePath);
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image provided'
      });
    }
    
    // Delete old file
    const oldFilePath = path.join(__dirname, '..', 'uploads', existingImage.category, existingImage.filename);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
    
    // Update database record
    existingImage.filename = filename;
    existingImage.mimetype = mimetype;
    existingImage.size = size;
    existingImage.url = `/uploads/${existingImage.category}/${filename}`;
    if (originalName) existingImage.originalName = originalName;
    
    const updatedImage = await existingImage.save();
    
    res.status(200).json({
      success: true,
      message: 'Image replaced successfully',
      data: updatedImage
    });
  } catch (error) {
    console.error(`Replace image ${req.params.id} error:`, error);
    
    // Clean up file if database update failed
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get image statistics
exports.getImageStats = async (req, res) => {
  try {
    const stats = await Image.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const totalImages = await Image.countDocuments({ isActive: true });
    const totalSize = await Image.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalImages,
        totalSize: totalSize[0]?.totalSize || 0,
        byCategory: stats
      }
    });
  } catch (error) {
    console.error('Get image stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};