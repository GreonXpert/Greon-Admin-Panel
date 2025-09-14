const AdvisoryMember = require('../models/advisoryBoardMemberModel');

// Helper function to clean expertise data (same as before)
const cleanExpertiseArray = (expertise) => {
  if (!expertise) return [];
  
  let expertiseArray;
  
  if (typeof expertise === 'string') {
    if (expertise.startsWith('[') && expertise.endsWith(']')) {
      try {
        expertiseArray = JSON.parse(expertise);
      } catch (e) {
        expertiseArray = expertise
          .slice(1, -1)
          .split(',')
          .map(item => item.trim().replace(/['"]/g, ''))
          .filter(item => item.length > 0);
      }
    } else {
      expertiseArray = expertise.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
  } else if (Array.isArray(expertise)) {
    expertiseArray = expertise;
  } else {
    expertiseArray = [String(expertise)];
  }
  
  return expertiseArray
    .map(item => {
      if (typeof item !== 'string') return String(item);
      return item
        .replace(/[\[\]"'\\]/g, '')
        .replace(/^,+|,+$/g, '')
        .trim()
    })
    .filter(item => item.length > 0)
    .filter((item, index, arr) => arr.indexOf(item) === index);
};

// Helper function to format LinkedIn URL
const formatLinkedInUrl = (url) => {
  if (!url) return '';
  
  let cleanUrl = url.trim();
  
  if (cleanUrl && !cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  
  if (cleanUrl.includes('linkedin.com') && !cleanUrl.includes('www.linkedin.com')) {
    cleanUrl = cleanUrl.replace('linkedin.com', 'www.linkedin.com');
  }
  
  return cleanUrl;
};

// @desc Get all advisory board members
// @route GET /api/advisory-board
// @access Public
exports.getAdvisoryMembers = async (req, res) => {
  try {
    const members = await AdvisoryMember.find().sort({ createdAt: -1 });
    
    const cleanedMembers = members.map(member => ({
      ...member.toObject(),
      expertise: cleanExpertiseArray(member.expertise)
    }));
    
    res.json({ 
      success: true, 
      data: cleanedMembers,
      count: cleanedMembers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get Advisory Members Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error',
      timestamp: new Date().toISOString()
    });
  }
};

// @desc Add a new advisory board member
// @route POST /api/advisory-board
// @access Private
exports.addAdvisoryMember = async (req, res) => {
  try {
    const { name, title, company, expertise, bio, icon, color, yearsExperience, linkedinUrl } = req.body;

    if (!name || !title || !expertise || !bio || !yearsExperience) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields.',
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload an image.',
        timestamp: new Date().toISOString()
      });
    }

    const cleanedExpertise = cleanExpertiseArray(expertise);
    const formattedLinkedInUrl = formatLinkedInUrl(linkedinUrl);
    const imageUrl = `/uploads/advisoryBoard/${req.file.filename}`;

    const newMember = new AdvisoryMember({
      name,
      title,
      company,
      imageUrl,
      expertise: cleanedExpertise,
      bio,
      icon,
      color,
      yearsExperience,
      linkedinUrl: formattedLinkedInUrl,
    });

    await newMember.save();

    // Get Socket.IO instance and emit real-time update (following emission pattern)
    const io = req.app.get('io');
    if (io) {
      // Fetch all updated advisory members data
      const allMembers = await AdvisoryMember.find().sort({ createdAt: -1 });
      const cleanedAllMembers = allMembers.map(member => ({
        ...member.toObject(),
        expertise: cleanExpertiseArray(member.expertise)
      }));
      
      // Emit to all clients in the advisory board rooms
      io.to('advisoryBoard').emit('advisory-members-updated', {
        success: true,
        data: cleanedAllMembers,
        newRecord: {
          ...newMember.toObject(),
          expertise: cleanedExpertise
        },
        action: 'created',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Real-time advisory update sent for member: ${name}`);
    }

    console.log(`✅ Advisory Member Added: ${name}`);

    res.status(201).json({ 
      success: true, 
      data: {
        ...newMember.toObject(),
        expertise: cleanedExpertise
      },
      message: 'Advisory member added successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Add Advisory Member Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// @desc Update an advisory board member
// @route PUT /api/advisory-board/:id
// @access Private
exports.updateAdvisoryMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, company, expertise, bio, icon, color, yearsExperience, linkedinUrl } = req.body;

    const updates = { name, title, company, bio, icon, color, yearsExperience };

    if (expertise) {
      updates.expertise = cleanExpertiseArray(expertise);
    }

    if (linkedinUrl !== undefined) {
      updates.linkedinUrl = formatLinkedInUrl(linkedinUrl);
    }

    if (req.file) {
      updates.imageUrl = `/uploads/advisoryBoard/${req.file.filename}`;
    }

    const updatedMember = await AdvisoryMember.findByIdAndUpdate(id, { $set: updates }, {
      new: true,
      runValidators: true,
    });

    if (!updatedMember) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Emit real-time update (following emission pattern)
    const io = req.app.get('io');
    if (io) {
      const allMembers = await AdvisoryMember.find().sort({ createdAt: -1 });
      const cleanedAllMembers = allMembers.map(member => ({
        ...member.toObject(),
        expertise: cleanExpertiseArray(member.expertise)
      }));
      
      io.to('advisoryBoard').emit('advisory-members-updated', {
        success: true,
        data: cleanedAllMembers,
        updatedRecord: {
          ...updatedMember.toObject(),
          expertise: cleanExpertiseArray(updatedMember.expertise)
        },
        action: 'updated',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Real-time advisory update sent for updated member: ${updatedMember.name}`);
    }

    console.log(`🔄 Advisory Member Updated: ${updatedMember.name}`);

    res.json({ 
      success: true, 
      data: {
        ...updatedMember.toObject(),
        expertise: cleanExpertiseArray(updatedMember.expertise)
      },
      message: 'Advisory member updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Update Advisory Member Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// @desc Delete an advisory board member
// @route DELETE /api/advisory-board/:id
// @access Private
exports.deleteAdvisoryMember = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMember = await AdvisoryMember.findByIdAndDelete(id);

    if (!deletedMember) {
      return res.status(404).json({ 
        success: false, 
        message: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Emit real-time update (following emission pattern)
    const io = req.app.get('io');
    if (io) {
      const allMembers = await AdvisoryMember.find().sort({ createdAt: -1 });
      const cleanedAllMembers = allMembers.map(member => ({
        ...member.toObject(),
        expertise: cleanExpertiseArray(member.expertise)
      }));
      
      io.to('advisoryBoard').emit('advisory-members-updated', {
        success: true,
        data: cleanedAllMembers,
        deletedRecord: {
          id: deletedMember._id,
          name: deletedMember.name
        },
        action: 'deleted',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Real-time advisory update sent for deleted member: ${deletedMember.name}`);
    }

    console.log(`🗑️ Advisory Member Deleted: ${deletedMember.name}`);

    res.json({ 
      success: true, 
      message: 'Member deleted successfully',
      deletedMember: {
        id: deletedMember._id,
        name: deletedMember.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Delete Advisory Member Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error',
      timestamp: new Date().toISOString()
    });
  }
};
