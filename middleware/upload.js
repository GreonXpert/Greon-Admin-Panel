// middleware/upload.js - COMPLETE FIXED VERSION
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PbsCategory = require('../models/PoweredByScience/pbsCategory');
const sanitize = require('sanitize-filename');

// ✅ Create base upload directories on startup
const createUploadDirectories = () => {
  const baseDir = path.join(__dirname, '..', 'uploads');
  
  const directories = [
    // Existing directories
    'partnerships',
    'recognitions', 
    'ClimateIntelligence',
    'advisoryBoard',
    'SustainabilityStory/Blog',
    'SustainabilityStory/Video',
    'SustainabilityStory/Resources',
    'SustainabilityStory/Authors',
    'SustainabilityStory/Files',
    
    // ✅ External Submission directories
    'ExternalSubmissions/Blog',
    'ExternalSubmissions/Video', 
    'ExternalSubmissions/Resources',
    'ExternalSubmissions/Authors',
    'ExternalSubmissions/Files',
    'ExternalSubmissions/General',
    
    // Default images
    'defaults',
    'Journey',
    'Journey/logos',
    'Team',
    'solutions',
  ];

  directories.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${fullPath}`);
    }
  });
};

// Initialize directories on module load
createUploadDirectories();

// ✅ Helper function to sanitize filenames
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
};

// Function to create storage configuration for multer
const createStorage = (folder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, `../uploads/${folder}`);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = sanitizeFilename(file.originalname);
      cb(null, 'image-' + uniqueSuffix + path.extname(sanitizedName));
    }
  });
};


// Enhanced file filter with better validation
const fileFilter = (req, file, cb) => {
  console.log(`📄 Validating file: ${file.originalname}, MIME: ${file.mimetype}`);
  
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    // Documents
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Videos
    'video/mp4',
    'video/avi',
    'video/mov'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    console.log(`✅ File accepted: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`❌ File rejected: ${file.originalname}, MIME: ${file.mimetype}`);
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images and documents are allowed.`), false);
  }
};

// Create upload directories if they don't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
};

// ✅ FIXED: External Submission Storage Configuration
const externalSubmissionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(`📁 Processing external submission file: ${file.fieldname} for category: ${req.body.category}`);
    
    let folderPath;
    const baseUploadPath = path.join(__dirname, '..', 'uploads', 'ExternalSubmissions');
    
    // Determine upload path based on file type and category
    switch (file.fieldname) {
      case 'image':
        // Main story images go to category folder
        const category = req.body.category || 'Blog';
        folderPath = path.join(baseUploadPath, category);
        break;
        
      case 'authorImage':
        // Author images go to Authors folder
        folderPath = path.join(baseUploadPath, 'Authors');
        break;
        
      case 'file':
        // Resource files go to Files folder
        folderPath = path.join(baseUploadPath, 'Files');
        break;
        
      default:
        // Fallback to general folder
        folderPath = path.join(baseUploadPath, 'General');
    }
    
    // Ensure directory exists
    ensureDirectoryExists(folderPath);
    
    console.log(`📤 External submission upload destination: ${folderPath}`);
    cb(null, folderPath);
  },
  
  filename: function (req, file, cb) {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedOriginalName);
    const baseName = path.basename(sanitizedOriginalName, extension);
    
    // Prefix based on file type
    let prefix = 'submission';
    switch (file.fieldname) {
      case 'image':
        prefix = 'main-image';
        break;
      case 'authorImage':
        prefix = 'author-image';
        break;
      case 'file':
        prefix = 'resource-file';
        break;
    }
    
    const filename = `${prefix}-${timestamp}-${random}-${baseName}${extension}`;
    console.log(`📄 External submission filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ NEW: External Submission Upload Middleware
const uploadExternalSubmission = multer({
  storage: externalSubmissionStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 3 // Maximum 3 files
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'authorImage', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

// ✅ UPDATED: Journey Storage Configuration
const journeyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    const baseUploadPath = path.join(__dirname, '..', 'uploads', 'Journey');
    
    // ✅ NEW: Different paths for different file types
    if (file.fieldname === 'logoImages') {
      uploadPath = path.join(baseUploadPath, 'logos');
    } else {
      uploadPath = baseUploadPath;
    }
    
    ensureDirectoryExists(uploadPath);
    console.log(`📤 Journey upload destination: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedOriginalName);
    const baseName = path.basename(sanitizedOriginalName, extension);
    
    // ✅ NEW: Different prefixes for different file types
    const prefix = file.fieldname === 'logoImages' ? 'logo' : 'journey';
    const filename = `${prefix}-${timestamp}-${random}-${baseName}${extension}`;
    
    console.log(`📄 Journey filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ UPDATED: Journey Upload Middleware to handle both images and logoImages
const uploadJourney = multer({
  storage: journeyStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 14 // Maximum 14 files total (4 main + 10 logos)
  }
}).fields([
  { name: 'images', maxCount: 4 },     // Main images
  { name: 'logoImages', maxCount: 10 } // Logo images
]);

// ✅ EXISTING: Sustainability Story Storage (Fixed)
const sustainabilityStoryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folderPath;
    const baseUploadPath = path.join(__dirname, '..', 'uploads', 'SustainabilityStory');

    switch (file.fieldname) {
      case 'authorImage':
        folderPath = path.join(baseUploadPath, 'Authors');
        break;
      case 'file':
        folderPath = path.join(baseUploadPath, 'Files');
        break;
      default: // 'image'
        const category = req.body.category || 'Blog';
        const categoryFolder = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        folderPath = path.join(baseUploadPath, categoryFolder);
    }
    
    ensureDirectoryExists(folderPath);
    cb(null, folderPath);
  },
  filename: function (req, file, cb) {
    const sanitizedName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, extension);
    
    let prefix = 'story';
    switch (file.fieldname) {
      case 'authorImage':
        prefix = 'author';
        break;
      case 'file':
        prefix = 'resource';
        break;
      default:
        prefix = 'main';
    }
    
    const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}-${baseName}${extension}`;
    cb(null, uniqueName);
  }
});

const uploadSustainabilityStory = multer({
  storage: sustainabilityStoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'authorImage', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

// ✅ Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer Error:', err);
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 50MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: `Unexpected file field: ${err.field}`
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
    }
  } else if (err) {
    console.error('❌ Upload Error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  
  next();
};

// Existing middleware (unchanged)
const uploadPartnership = multer({
  storage: createStorage('partnerships'),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }
}).single('image');

const uploadRecognition = multer({
  storage: createStorage('recognitions'),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }
}).single('image');
// ✅ ADD: Team Storage Configuration
const teamStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'Team');
    ensureDirectoryExists(uploadPath);
    console.log(`📤 Team upload destination: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedOriginalName);
    const baseName = path.basename(sanitizedOriginalName, extension);
    const filename = `team-${timestamp}-${random}-${baseName}${extension}`;
    console.log(`📄 Team filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ ADD: Team Upload Middleware
const uploadTeamMember = multer({
  storage: teamStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 5 // Maximum 5 files for team member
  }
}).array('images', 5); // Accept up to 5 images with field name 'images'
// ✅ ADD: Solutions Storage Configuration
const solutionsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'solutions');
    ensureDirectoryExists(uploadPath);
    console.log(`📤 Solutions upload destination: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = sanitizeFilename(file.originalname);
    const extension = path.extname(sanitizedOriginalName);
    const baseName = path.basename(sanitizedOriginalName, extension);
    const filename = `solution-${timestamp}-${random}-${baseName}${extension}`;
    console.log(`📄 Solutions filename: ${filename}`);
    cb(null, filename);
  }
});

// ✅ ADD: Solutions Upload Middleware
const uploadSolutions = multer({
  storage: solutionsStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // Maximum 10 files for solution
  }
}).array('images', 10); // Accept up to 10 images with field name 'images'

// PBS Storage (unchanged)
const pbsStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const categoryId = req.body.category;
      if (!categoryId) {
        return cb(new Error('Category ID must be provided in the form body.'));
      }

      const category = await PbsCategory.findById(categoryId);
      if (!category) {
        return cb(new Error('Category not found for the provided ID.'));
      }

      const folderName = category.name.replace(/\s+/g, '-').toLowerCase();
      const uploadPath = path.join(__dirname, `../uploads/PoweredByScience/${folderName}`);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const _pbsAny = multer({
  storage: pbsStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }
}).any();

const uploadPbsFramework = (req, res, next) => {
  _pbsAny(req, res, (err) => {
    if (err) return next(err);
    if (!req.file && Array.isArray(req.files)) {
      req.file = req.files.find(f => f.fieldname === 'image') || req.files[0];
    }
    if (Array.isArray(req.files) && req.files.length > 1) {
      return next(new multer.MulterError('LIMIT_UNEXPECTED_FILE', req.files[1]?.fieldname));
    }
    return next();
  });
};

const uploadClimateFeature = multer({
  storage: createStorage('ClimateIntelligence'),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }
}).single('image');

const uploadAdvisoryMember = multer({
  storage: createStorage('advisoryBoard'),
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }
}).single('image');

module.exports = {
  // Existing exports
  uploadPartnership,
  uploadRecognition,
  uploadPbsFramework,
  uploadClimateFeature,
  uploadAdvisoryMember,
  uploadSustainabilityStory,
  
  // New exports
  uploadExternalSubmission,
  handleUploadError,
  createUploadDirectories,
  uploadJourney,
  uploadTeamMember,
  uploadSolutions
};
