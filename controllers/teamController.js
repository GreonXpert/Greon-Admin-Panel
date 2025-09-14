// controllers/teamController.js

const mongoose = require('mongoose');
const Team = require('../models/team');
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

// ✅ FIXED: Helper function to process files for team upload
function processTeamFiles(files) {
  if (!files || !Array.isArray(files)) return [];
  return files;
}

// @desc Get all team members
// @route GET /api/team
// @access Public
exports.getAllTeamMembers = async (req, res) => {
  try {
    const {
      status = 'active',
      featured,
      department,
      role,
      limit,
      sort = 'displayOrder'
    } = req.query;

    // Build query
    const query = status === 'all' ? {} : { status };
    
    if (featured !== undefined) {
      query.featured = featured === 'true';
    }
    
    if (department) {
      query.department = new RegExp(department, 'i');
    }
    
    if (role) {
      query.role = new RegExp(role, 'i');
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'name':
        sortQuery = { name: 1 };
        break;
      case 'joinDate':
        sortQuery = { joinDate: -1 };
        break;
      case 'experience':
        sortQuery = { experience: -1 };
        break;
      default:
        sortQuery = { displayOrder: 1, name: 1 };
    }

    let teamQuery = Team.find(query).sort(sortQuery);
    
    if (limit) {
      teamQuery = teamQuery.limit(parseInt(limit));
    }

    const teamMembers = await teamQuery;

    res.json({
      success: true,
      count: teamMembers.length,
      data: teamMembers
    });
  } catch (error) {
    console.error('getAllTeamMembers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Get team stats
// @route GET /api/team/stats
// @access Public
exports.getTeamStats = async (req, res) => {
  try {
    const stats = await Team.aggregate([
      {
        $group: {
          _id: null,
          totalMembers: { $sum: 1 },
          activeMembers: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          featuredMembers: {
            $sum: { $cond: ['$featured', 1, 0] }
          },
          avgExperience: { $avg: '$experience' },
          departments: { $addToSet: '$department' },
          roles: { $addToSet: '$role' }
        }
      }
    ]);

    const roleStats = await Team.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalMembers: 0,
          activeMembers: 0,
          featuredMembers: 0,
          avgExperience: 0,
          departments: [],
          roles: []
        },
        roleDistribution: roleStats
      }
    });
  } catch (error) {
    console.error('getTeamStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Get single team member by ID
// @route GET /api/team/:id
// @access Public
exports.getTeamMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team member ID'
      });
    }

    const teamMember = await Team.findById(id);
    
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    console.error('getTeamMemberById error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Add new team member
// @route POST /api/team
// @access Private
exports.addTeamMember = async (req, res) => {
  try {
    console.log('📝 Add team member request received');
    console.log('📄 Request body:', req.body);
    console.log('📸 Request files:', req.files);

    const {
      name, role, bio, description, email, linkedin, twitter, github,
      experience, location, department, status = 'active',
      displayOrder = 0, featured = false
    } = req.body;

    // Validate required fields
    if (!name || !role || !bio || !description) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, role, bio, description'
      });
    }

    // ✅ FIXED: Process uploaded files
    const uploadedFiles = processTeamFiles(req.files);
    console.log('📸 Processed files:', uploadedFiles);

    // Check if at least one image was uploaded
    if (uploadedFiles.length === 0) {
      console.log('❌ No images uploaded');
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image'
      });
    }

    // Process images (up to 5)
    const images = uploadedFiles.slice(0, 5).map((file, index) => ({
      url: `/uploads/Team/${file.filename}`,
      caption: req.body[`imageCaption${index}`] || '',
      isPrimary: index === 0
    }));

    // Set primary image URL
    const imageUrl = images[0].url;

    // Normalize array fields
    const specialised = normalizeArrayField(req.body.specialised);
    const achievements = normalizeArrayField(req.body.achievements);
    const certifications = normalizeArrayField(req.body.certifications);
    const languages = normalizeArrayField(req.body.languages);
    const hobbies = normalizeArrayField(req.body.hobbies);

    // Process education if provided
    let education = [];
    if (req.body.education) {
      try {
        education = JSON.parse(req.body.education);
      } catch (e) {
        education = [];
      }
    }

    // Create new team member
    const teamMember = new Team({
      name,
      role,
      bio,
      description,
      specialised,
      images,
      imageUrl,
      email,
      linkedin,
      twitter,
      github,
      experience: parseInt(experience) || 0,
      location,
      department,
      achievements,
      education,
      certifications,
      languages,
      hobbies,
      status,
      displayOrder: parseInt(displayOrder) || 0,
      featured: Boolean(featured === 'true' || featured === true)
    });

    await teamMember.save();
    console.log('✅ Team member saved successfully');

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const allTeamMembers = await Team.find({ status: 'active' })
        .sort({ displayOrder: 1, name: 1 });
      
      io.to('team').emit('team-updated', {
        success: true,
        data: allTeamMembers,
        newRecord: teamMember,
        action: 'created',
        timestamp: new Date().toISOString()
      });

      io.to('team-admin').emit('team-admin-updated', {
        success: true,
        data: await Team.find().sort({ displayOrder: 1, name: 1 }),
        newRecord: teamMember,
        action: 'created',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Team member created: ${teamMember.name} - ${teamMember.role}`);
    }

    res.status(201).json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    console.error('addTeamMember error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Team member with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
};

// @desc Update team member
// @route PUT /api/team/:id
// @access Private
exports.updateTeamMember = async (req, res) => {
  try {
    console.log('📝 Update team member request received');
    console.log('📄 Request body:', req.body);
    console.log('📸 Request files:', req.files);

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team member ID'
      });
    }

    const existingTeamMember = await Team.findById(id);
    if (!existingTeamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Build update object
    const updates = {};
    
    // Handle text fields
    ['name', 'role', 'bio', 'description', 'email', 'linkedin', 'twitter', 'github',
     'experience', 'location', 'department', 'status', 'displayOrder', 'featured'].forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'experience' || field === 'displayOrder') {
          updates[field] = parseInt(req.body[field]) || 0;
        } else if (field === 'featured') {
          updates[field] = Boolean(req.body[field] === 'true' || req.body[field] === true);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Handle array fields
    ['specialised', 'achievements', 'certifications', 'languages', 'hobbies'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = normalizeArrayField(req.body[field]);
      }
    });

    // Handle education
    if (req.body.education !== undefined) {
      try {
        updates.education = JSON.parse(req.body.education);
      } catch (e) {
        updates.education = [];
      }
    }

    // Handle removed images (delete files from disk)
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

    // ✅ FIXED: Handle new image uploads and remaining images
    const uploadedFiles = processTeamFiles(req.files);
    
    // Handle images
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
        const newImages = uploadedFiles.slice(0, 5).map((file, index) => ({
          url: `/uploads/Team/${file.filename}`,
          caption: req.body[`imageCaption${index}`] || '',
          isPrimary: finalImages.length === 0 && index === 0 // First image is primary if no existing images
        }));
        finalImages = [...finalImages, ...newImages];
      }

      // Ensure we don't exceed 5 images
      finalImages = finalImages.slice(0, 5);
      
      // Set primary image if none exists
      if (finalImages.length > 0 && !finalImages.some(img => img.isPrimary)) {
        finalImages[0].isPrimary = true;
      }

      updates.images = finalImages;
      if (finalImages.length > 0) {
        updates.imageUrl = finalImages.find(img => img.isPrimary)?.url || finalImages[0].url;
      }
    }

    const updatedTeamMember = await Team.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allTeamMembers = await Team.find({ status: 'active' })
        .sort({ displayOrder: 1, name: 1 });
      
      io.to('team').emit('team-updated', {
        success: true,
        data: allTeamMembers,
        updatedRecord: updatedTeamMember,
        action: 'updated',
        timestamp: new Date().toISOString()
      });

      io.to('team-admin').emit('team-admin-updated', {
        success: true,
        data: await Team.find().sort({ displayOrder: 1, name: 1 }),
        updatedRecord: updatedTeamMember,
        action: 'updated',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Team member updated: ${updatedTeamMember.name} - ${updatedTeamMember.role}`);
    }

    res.json({
      success: true,
      data: updatedTeamMember
    });
  } catch (error) {
    console.error('updateTeamMember error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Team member with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server Error: ' + error.message
    });
  }
};

// @desc Delete team member
// @route DELETE /api/team/:id
// @access Private
exports.deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid team member ID'
      });
    }

    const teamMemberToDelete = await Team.findById(id);
    if (!teamMemberToDelete) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Delete all associated files before deleting the record
    const filesToDelete = [];
    
    // Add images to deletion list
    if (teamMemberToDelete.images && teamMemberToDelete.images.length > 0) {
      teamMemberToDelete.images.forEach(image => {
        if (image.url) {
          filesToDelete.push(image.url);
        }
      });
    }

    // Delete all files from filesystem
    if (filesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${filesToDelete.length} files for team member: ${teamMemberToDelete.name}`);
      deleteFiles(filesToDelete);
    }

    // Now delete the record from database
    const deletedTeamMember = await Team.findByIdAndDelete(id);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const allTeamMembers = await Team.find({ status: 'active' })
        .sort({ displayOrder: 1, name: 1 });
      
      io.to('team').emit('team-updated', {
        success: true,
        data: allTeamMembers,
        deletedRecord: deletedTeamMember,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });

      io.to('team-admin').emit('team-admin-updated', {
        success: true,
        data: await Team.find().sort({ displayOrder: 1, name: 1 }),
        deletedRecord: deletedTeamMember,
        action: 'deleted',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Team member deleted: ${deletedTeamMember.name} - ${deletedTeamMember.role}`);
    }

    res.json({
      success: true,
      message: 'Team member and associated files deleted successfully'
    });
  } catch (error) {
    console.error('deleteTeamMember error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc Update display order of team members
// @route PUT /api/team/reorder/members
// @access Private
exports.reorderTeamMembers = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide orderedIds as an array'
      });
    }

    const updatePromises = orderedIds.map((id, index) =>
      Team.findByIdAndUpdate(id, { displayOrder: index })
    );

    await Promise.all(updatePromises);

    const reorderedTeamMembers = await Team.find({ status: 'active' })
      .sort({ displayOrder: 1, name: 1 });

    const io = req.app.get('io');
    if (io) {
      io.to('team').emit('team-updated', {
        success: true,
        data: reorderedTeamMembers,
        action: 'reordered',
        timestamp: new Date().toISOString()
      });

      io.to('team-admin').emit('team-admin-updated', {
        success: true,
        data: await Team.find().sort({ displayOrder: 1, name: 1 }),
        action: 'reordered',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: reorderedTeamMembers
    });
  } catch (error) {
    console.error('reorderTeamMembers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
