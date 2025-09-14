// controllers/solutionController.js

const mongoose = require('mongoose');
const Solution = require('../models/solution');
const fs = require('fs');
const path = require('path');

// Helper function to delete files from filesystem
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

// Helper function to delete multiple files
function deleteFiles(filePaths) {
  if (!Array.isArray(filePaths)) return;
  filePaths.forEach(filePath => {
    if (filePath && typeof filePath === 'string') {
      deleteFileIfExists(filePath);
    }
  });
}

// Helper function to process uploaded files
function processSolutionFiles(files) {
  if (!files || !Array.isArray(files)) return [];
  return files;
}

// @desc Get all solutions
// @route GET /api/solutions
// @access Public
exports.getAllSolutions = async (req, res) => {
  try {
    const {
      status = 'published',
      featured,
      kind,
      limit,
      sort = 'order'
    } = req.query;

    // Build query
    const query = status === 'all' ? {} : { status };
    
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }
    
    if (kind) {
      query.kind = new RegExp(kind, 'i');
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'title':
        sortQuery = { 'title.0': 1 };
        break;
      case 'created':
        sortQuery = { createdAt: -1 };
        break;
      case 'updated':
        sortQuery = { updatedAt: -1 };
        break;
      default:
        sortQuery = { order: 1, createdAt: -1 };
    }

    let solutionQuery = Solution.find(query).sort(sortQuery);
    
    if (limit) {
      solutionQuery = solutionQuery.limit(parseInt(limit));
    }

    const solutions = await solutionQuery;

    res.json({
      success: true,
      count: solutions.length,
      data: solutions
    });
  } catch (error) {
    console.error('getAllSolutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Get solution stats
// @route GET /api/solutions/stats
// @access Public
exports.getSolutionStats = async (req, res) => {
  try {
    const stats = await Solution.aggregate([
      {
        $group: {
          _id: null,
          totalSolutions: { $sum: 1 },
          publishedSolutions: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          featuredSolutions: {
            $sum: { $cond: ['$featured', 1, 0] }
          },
          kinds: { $addToSet: '$kind' }
        }
      }
    ]);

    const kindStats = await Solution.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalSolutions: 0,
          publishedSolutions: 0,
          featuredSolutions: 0,
          kinds: []
        },
        kindDistribution: kindStats
      }
    });
  } catch (error) {
    console.error('getSolutionStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Get single solution by ID
// @route GET /api/solutions/:id
// @access Public
exports.getSolutionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid solution ID'
      });
    }

    const solution = await Solution.findById(id);
    
    if (!solution) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found'
      });
    }

    res.json({
      success: true,
      data: solution
    });
  } catch (error) {
    console.error('getSolutionById error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Add new solution
// @route POST /api/solutions
// @access Private
exports.addSolution = async (req, res) => {
  try {
    console.log('📝 Add solution request received');
    console.log('📄 Request body:', req.body);
    console.log('📸 Request files:', req.files);

    const {
      key, kind, tag, title, kicker, short, description, features, bgWord,
      primaryColor, secondaryColor, bg, product, specs, status = 'draft',
      order = 0, featured = false
    } = req.body;

    // Validate required fields
    if (!key || !tag || !short || !description) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: key, tag, short, description'
      });
    }

    // Process uploaded files
    const uploadedFiles = processSolutionFiles(req.files);
    console.log('📸 Processed files:', uploadedFiles);

    // Process images
    const images = uploadedFiles.map((file, index) => ({
      url: `/uploads/solutions/${file.filename}`,
      caption: req.body[`imageCaption${index}`] || ''
    }));

    // Parse array fields
    const titleArray = title ? (Array.isArray(title) ? title : JSON.parse(title)) : [];
    const featuresArray = features ? (Array.isArray(features) ? features : JSON.parse(features)) : [];
    const specsArray = specs ? (Array.isArray(specs) ? specs : JSON.parse(specs)) : [];

    // Create new solution
    const solution = new Solution({
      key,
      kind,
      tag,
      title: titleArray,
      kicker,
      short,
      description,
      features: featuresArray,
      bgWord,
      primaryColor: primaryColor || '#1AC99F',
      secondaryColor: secondaryColor || '#E8F8F4',
      images,
      bg,
      product,
      specs: specsArray,
      status,
      order: parseInt(order) || 0,
      featured: Boolean(featured === 'true' || featured === true)
    });

    await solution.save();
    console.log('✅ Solution saved successfully');

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const allSolutions = await Solution.find({ status: 'published' })
        .sort({ order: 1, createdAt: -1 });
      
      io.to('solutions').emit('solutions-updated', {
        success: true,
        data: allSolutions,
        newRecord: solution,
        action: 'created',
        timestamp: new Date().toISOString()
      });

      io.to('solutions-admin').emit('solutions-admin-updated', {
        success: true,
        data: await Solution.find().sort({ order: 1, createdAt: -1 }),
        newRecord: solution,
        action: 'created',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Solution created: ${solution.key} - ${solution.tag}`);
    }

    res.status(201).json({
      success: true,
      data: solution
    });
  } catch (error) {
    console.error('addSolution error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Solution with this key already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
};

// @desc Update solution
// @route PUT /api/solutions/:id
// @access Private
exports.updateSolution = async (req, res) => {
  try {
    console.log('📝 Update solution request received');
    console.log('📄 Request body:', req.body);
    console.log('📸 Request files:', req.files);

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid solution ID'
      });
    }

    const existingSolution = await Solution.findById(id);
    if (!existingSolution) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found'
      });
    }

    // Build update object
    const updates = {};
    
    // Handle text fields
    ['key', 'kind', 'tag', 'kicker', 'short', 'description', 'bgWord', 
     'primaryColor', 'secondaryColor', 'bg', 'product', 'status', 'order', 'featured'].forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'order') {
          updates[field] = parseInt(req.body[field]) || 0;
        } else if (field === 'featured') {
          updates[field] = Boolean(req.body[field] === 'true' || req.body[field] === true);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Handle array fields
    ['title', 'features', 'specs'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = Array.isArray(req.body[field]) ? req.body[field] : JSON.parse(req.body[field] || '[]');
      }
    });

    // Handle removed images
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

    // Handle new image uploads
    const uploadedFiles = processSolutionFiles(req.files);
    
    if (req.body.keepExistingImages || uploadedFiles.length > 0) {
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
      if (uploadedFiles.length > 0) {
        const newImages = uploadedFiles.map((file, index) => ({
          url: `/uploads/solutions/${file.filename}`,
          caption: req.body[`imageCaption${index}`] || ''
        }));
        finalImages = [...finalImages, ...newImages];
      }

      updates.images = finalImages;
    }

    const updatedSolution = await Solution.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allSolutions = await Solution.find({ status: 'published' })
        .sort({ order: 1, createdAt: -1 });
      
      io.to('solutions').emit('solutions-updated', {
        success: true,
        data: allSolutions,
        updatedRecord: updatedSolution,
        action: 'updated',
        timestamp: new Date().toISOString()
      });

      io.to('solutions-admin').emit('solutions-admin-updated', {
        success: true,
        data: await Solution.find().sort({ order: 1, createdAt: -1 }),
        updatedRecord: updatedSolution,
        action: 'updated',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Solution updated: ${updatedSolution.key} - ${updatedSolution.tag}`);
    }

    res.json({
      success: true,
      data: updatedSolution
    });
  } catch (error) {
    console.error('updateSolution error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Solution with this key already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
};

// @desc Delete solution
// @route DELETE /api/solutions/:id
// @access Private
exports.deleteSolution = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid solution ID'
      });
    }

    const solutionToDelete = await Solution.findById(id);
    if (!solutionToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Solution not found'
      });
    }

    // Delete all associated files
    const filesToDelete = [];
    
    if (solutionToDelete.images && solutionToDelete.images.length > 0) {
      solutionToDelete.images.forEach(image => {
        if (image.url) {
          filesToDelete.push(image.url);
        }
      });
    }

    if (filesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${filesToDelete.length} files for solution: ${solutionToDelete.key}`);
      deleteFiles(filesToDelete);
    }

    const deletedSolution = await Solution.findByIdAndDelete(id);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allSolutions = await Solution.find({ status: 'published' })
        .sort({ order: 1, createdAt: -1 });
      
      io.to('solutions').emit('solutions-updated', {
        success: true,
        data: allSolutions,
        deletedRecord: deletedSolution,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });

      io.to('solutions-admin').emit('solutions-admin-updated', {
        success: true,
        data: await Solution.find().sort({ order: 1, createdAt: -1 }),
        deletedRecord: deletedSolution,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Solution deleted: ${deletedSolution.key} - ${deletedSolution.tag}`);
    }

    res.json({
      success: true,
      message: 'Solution and associated files deleted successfully'
    });
  } catch (error) {
    console.error('deleteSolution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Update display order of solutions
// @route PUT /api/solutions/reorder/solutions
// @access Private
exports.reorderSolutions = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderedIds as an array'
      });
    }

    const updatePromises = orderedIds.map((id, index) =>
      Solution.findByIdAndUpdate(id, { order: index })
    );

    await Promise.all(updatePromises);

    const reorderedSolutions = await Solution.find({ status: 'published' })
      .sort({ order: 1, createdAt: -1 });

    const io = req.app.get('io');
    if (io) {
      io.to('solutions').emit('solutions-updated', {
        success: true,
        data: reorderedSolutions,
        action: 'reordered',
        timestamp: new Date().toISOString()
      });

      io.to('solutions-admin').emit('solutions-admin-updated', {
        success: true,
        data: await Solution.find().sort({ order: 1, createdAt: -1 }),
        action: 'reordered',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: reorderedSolutions
    });
  } catch (error) {
    console.error('reorderSolutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
