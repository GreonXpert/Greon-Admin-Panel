// server.js - Updated sections
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const createSuperAdmin = require('./utils/createSuperAdmin');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URLS
  ? process.env.CLIENT_URLS.split(',')
  : [process.env.CLIENT_URL]
).concat([
  'http://localhost:3000',
  'http://localhost:3001',
  'https://famous-flan-b47c86.netlify.app',
  'https://silly-starburst-4799c5.netlify.app'
]).filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.options('*', cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.set('io', io);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB connected successfully.');
  try {
    await createSuperAdmin();
  } catch (error) {
    console.error('Failed to create super admin:', error);
  }
})
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join existing rooms
  socket.join('emissions');
  socket.join('trustedBy');
  socket.join('poweredByScience');
  socket.join('climateIntelligence');
  socket.join('advisoryBoard');
  socket.join('advisoryBoard-admin');
  socket.join('advisoryBoard-public');

  // NEW: Join sustainability story rooms
  socket.join('sustainabilityStories');
  socket.join('sustainabilityStories-blog');
  socket.join('sustainabilityStories-video');
  socket.join('sustainabilityStories-resources');
  socket.join('sustainabilityStories-admin');
  socket.join('journey');
  socket.join('journey-admin');
  socket.join('journey-public');
  socket.join('team');
  socket.join('team-admin');
  socket.join('team-public');
  socket.join('solutions');
  socket.join('solutions-admin');
  socket.join('solutions-public');
  socket.join('testimonials');
  socket.join('testimonials-admin');
  socket.join('testimonials-public');
  socket.join('projects');
  socket.join('projects-admin');
  socket.join('projects-public');


  // Existing emission data request
  socket.on('request-emissions-data', async () => {
    try {
      const Emission = require('./models/Emission');
      const emissions = await Emission.find().sort({ year: -1 });
      socket.emit('emissions-data', { success: true, data: emissions });
    } catch (error) {
      socket.emit('emissions-error', { success: false, message: 'Error fetching data' });
    }
  });

  // Existing advisory board data request
  socket.on('request-advisory-data', async () => {
    try {
      const AdvisoryMember = require('./models/advisoryBoardMemberModel');
      const members = await AdvisoryMember.find().sort({ createdAt: -1 });
      socket.emit('advisory-data', { success: true, data: members });
    } catch (error) {
      socket.emit('advisory-error', { success: false, message: 'Error fetching advisory data' });
    }
  });

  // NEW: Sustainability Stories data request
  socket.on('request-stories-data', async () => {
    try {
      const Story = require('./models/Story');
      const stories = await Story.find({ status: 'published' }).sort({ createdAt: -1 });
      socket.emit('stories-data', { success: true, data: stories });
    } catch (error) {
      socket.emit('stories-error', { success: false, message: 'Error fetching stories data' });
    }
  });

  // NEW: Join specific story rooms
  socket.on('join-story-room', (roomType = 'sustainabilityStories') => {
    const validRooms = [
      'sustainabilityStories', 
      'sustainabilityStories-blog', 
      'sustainabilityStories-video', 
      'sustainabilityStories-resources',
      'sustainabilityStories-admin'
    ];
    if (validRooms.includes(roomType)) {
      socket.join(roomType);
      console.log(`Socket ${socket.id} joined ${roomType} room`);
    }
  });

  socket.on('leave-story-room', (roomType = 'sustainabilityStories') => {
    const validRooms = [
      'sustainabilityStories', 
      'sustainabilityStories-blog', 
      'sustainabilityStories-video', 
      'sustainabilityStories-resources',
      'sustainabilityStories-admin'
    ];
    if (validRooms.includes(roomType)) {
      socket.leave(roomType);
      console.log(`Socket ${socket.id} left ${roomType} room`);
    }
  });

  // NEW: Real-time story engagement tracking
  socket.on('story-engagement', async (data) => {
    try {
      const { storyId, action, category } = data;
      
      // Emit to all sustainability story rooms
      io.to('sustainabilityStories').emit('story-engagement-update', {
        storyId,
        action,
        category,
        timestamp: new Date()
      });

      // Emit to specific category room
      if (category) {
        io.to(`sustainabilityStories-${category.toLowerCase()}`).emit('story-engagement-update', {
          storyId,
          action,
          category,
          timestamp: new Date()
        });
      }
    } catch (error) {
      socket.emit('story-engagement-error', { message: 'Failed to track engagement' });
    }
  });

  // Existing room management
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('join-emissions-room', () => {
    socket.join('emissions');
    console.log(`Socket ${socket.id} joined emissions room`);
  });

  socket.on('leave-emissions-room', () => {
    socket.leave('emissions');
    console.log(`Socket ${socket.id} left emissions room`);
  });

  socket.on('join-advisory-room', (roomType = 'advisoryBoard') => {
    const validRooms = ['advisoryBoard', 'advisoryBoard-admin', 'advisoryBoard-public'];
    if (validRooms.includes(roomType)) {
      socket.join(roomType);
      console.log(`Socket ${socket.id} joined ${roomType} room`);
    }
  });

  socket.on('leave-advisory-room', (roomType = 'advisoryBoard') => {
    const validRooms = ['advisoryBoard', 'advisoryBoard-admin', 'advisoryBoard-public'];
    if (validRooms.includes(roomType)) {
      socket.leave(roomType);
      console.log(`Socket ${socket.id} left ${roomType} room`);
    }
  });
  socket.on('request-journey-data', async () => {
  try {
    const Journey = require('./models/journey');
    const journeyData = await Journey.find({ status: 'published' })
      .sort({ displayOrder: 1, year: 1 });
    socket.emit('journey-data', { success: true, data: journeyData });
  } catch (error) {
    socket.emit('journey-error', { success: false, message: 'Error fetching journey data' });
  }
});

// ✅ ADD: Journey admin data request handler (add this inside the io.on('connection') callback)
socket.on('request-journey-admin-data', async () => {
  try {
    const Journey = require('./models/journey');
    const journeyData = await Journey.find().sort({ displayOrder: 1, year: 1 });
    socket.emit('journey-admin-data', { success: true, data: journeyData });
  } catch (error) {
    socket.emit('journey-admin-error', { success: false, message: 'Error fetching journey admin data' });
  }
});

// ✅ ADD: Join journey rooms (add this inside the io.on('connection') callback)
socket.on('join-journey-room', (roomType = 'journey') => {
  const validRooms = ['journey', 'journey-admin', 'journey-public'];
  if (validRooms.includes(roomType)) {
    socket.join(roomType);
    console.log(`Socket ${socket.id} joined ${roomType} room`);
  }
});

socket.on('leave-journey-room', (roomType = 'journey') => {
  const validRooms = ['journey', 'journey-admin', 'journey-public'];
  if (validRooms.includes(roomType)) {
    socket.leave(roomType);
    console.log(`Socket ${socket.id} left ${roomType} room`);
  }
});
// Team data request
socket.on('request-team-data', async () => {
  try {
    const Team = require('./models/team');
    const teamData = await Team.find({ status: 'active' })
      .sort({ displayOrder: 1, name: 1 });
    socket.emit('team-data', { success: true, data: teamData });
  } catch (error) {
    socket.emit('team-error', { success: false, message: 'Error fetching team data' });
  }
});

// Team admin data request
socket.on('request-team-admin-data', async () => {
  try {
    const Team = require('./models/team');
    const teamData = await Team.find().sort({ displayOrder: 1, name: 1 });
    socket.emit('team-admin-data', { success: true, data: teamData });
  } catch (error) {
    socket.emit('team-admin-error', { success: false, message: 'Error fetching team admin data' });
  }
});

// Join team rooms
socket.on('join-team-room', (roomType = 'team') => {
  const validRooms = ['team', 'team-admin', 'team-public'];
  if (validRooms.includes(roomType)) {
    socket.join(roomType);
    console.log(`Socket ${socket.id} joined ${roomType} room`);
  }
});

socket.on('leave-team-room', (roomType = 'team') => {
  const validRooms = ['team', 'team-admin', 'team-public'];
  if (validRooms.includes(roomType)) {
    socket.leave(roomType);
    console.log(`Socket ${socket.id} left ${roomType} room`);
  }
});
// Solutions data request
socket.on('request-solutions-data', async () => {
  try {
    const Solution = require('./models/solution');
    const solutionsData = await Solution.find({ status: 'published' })
      .sort({ order: 1, createdAt: -1 });
    socket.emit('solutions-data', { success: true, data: solutionsData });
  } catch (error) {
    socket.emit('solutions-error', { success: false, message: 'Error fetching solutions data' });
  }
});

// Solutions admin data request
socket.on('request-solutions-admin-data', async () => {
  try {
    const Solution = require('./models/solution');
    const solutionsData = await Solution.find().sort({ order: 1, createdAt: -1 });
    socket.emit('solutions-admin-data', { success: true, data: solutionsData });
  } catch (error) {
    socket.emit('solutions-admin-error', { success: false, message: 'Error fetching solutions admin data' });
  }
});

// Join solutions rooms
socket.on('join-solutions-room', (roomType = 'solutions') => {
  const validRooms = ['solutions', 'solutions-admin', 'solutions-public'];
  if (validRooms.includes(roomType)) {
    socket.join(roomType);
    console.log(`Socket ${socket.id} joined ${roomType} room`);
  }
});

socket.on('leave-solutions-room', (roomType = 'solutions') => {
  const validRooms = ['solutions', 'solutions-admin', 'solutions-public'];
  if (validRooms.includes(roomType)) {
    socket.leave(roomType);
    console.log(`Socket ${socket.id} left ${roomType} room`);
  }
});

socket.on('join-contact-room', (roomType = 'contact-forms') => {
  const validRooms = ['contact-forms', 'contact-forms-admin'];
  if (validRooms.includes(roomType)) {
    socket.join(roomType);
    console.log(`Socket ${socket.id} joined ${roomType} room`);
  }
});

socket.on('leave-contact-room', (roomType = 'contact-forms') => {
  const validRooms = ['contact-forms', 'contact-forms-admin'];
  if (validRooms.includes(roomType)) {
    socket.leave(roomType);
    console.log(`Socket ${socket.id} left ${roomType} room`);
  }
});
// Allow FE to explicitly join/leave
socket.on('join-testimonial-room', (roomType = 'testimonials') => {
  const valid = ['testimonials', 'testimonials-admin', 'testimonials-public'];
  if (valid.includes(roomType)) {
    socket.join(roomType);
    console.log(`Socket ${socket.id} joined ${roomType} room`);
  }
});
socket.on('leave-testimonial-room', (roomType = 'testimonials') => {
  const valid = ['testimonials', 'testimonials-admin', 'testimonials-public'];
  if (valid.includes(roomType)) {
    socket.leave(roomType);
    console.log(`Socket ${socket.id} left ${roomType} room`);
  }
});

// Fetch testimonials on demand
socket.on('request-testimonials-data', async (payload = {}) => {
  try {
    const Testimonial = require('./models/Testimonials/testimonialModel');
    const { status = 'approved', limit = 50, sort = '-rating,-createdAt' } = payload;
    const data = await Testimonial.find({ status }).sort(sort.split(',').join(' ')).limit(Number(limit));
    socket.emit('testimonials-data', { success: true, data });
  } catch (err) {
    socket.emit('testimonials-error', { success: false, message: 'Error fetching testimonials' });
  }
});

// Public list (e.g., completed/featured — adjust as needed)
socket.on('request-projects-data', async () => {
  try {
    const Project = require('./models/project');
    const data = await Project.find({ status: 'Completed' }).sort({ order: 1, createdAt: -1 });
    socket.emit('projects-data', { success: true, data });
  } catch (err) {
    socket.emit('projects-error', { success: false, message: 'Error fetching projects data' });
  }
});

// Admin list
socket.on('request-projects-admin-data', async () => {
  try {
    const Project = require('./models/project');
    const data = await Project.find().sort({ order: 1, createdAt: -1 });
    socket.emit('projects-admin-data', { success: true, data });
  } catch (err) {
    socket.emit('projects-admin-error', { success: false, message: 'Error fetching projects admin data' });
  }
});

// Room join/leave helpers
socket.on('join-projects-room', (room = 'projects') => {
  const valid = ['projects', 'projects-admin', 'projects-public'];
  if (valid.includes(room)) socket.join(room);
});
socket.on('leave-projects-room', (room = 'projects') => {
  const valid = ['projects', 'projects-admin', 'projects-public'];
  if (valid.includes(room)) socket.leave(room);
});


});

// Routes
const emissionRoutes = require('./routes/emissions');
const authRoutes = require('./routes/auth');
const trustedByRoutes = require('./routes/trustedBy');
const pbsRoutes = require('./routes/pbs');
const climateRoutes = require('./routes/climateIntelligenceRoutes');
const advisoryBoardRoutes = require('./routes/advisoryBoardRoutes');
const storyRoutes = require('./routes/storyRoutes'); // NEW
const submissionLinkRoutes = require('./routes/submissionLinks');
const pendingRoutes = require('./routes/pendingSubmissions');
const journeyRoutes = require('./routes/journeyRoutes');
const teamRoutes = require('./routes/teamRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const contactFormRoutes = require('./routes/contactFormRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes'); // NEW
const projectRoutes = require('./routes/projectRoutes');



app.use('/api/emissions', emissionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/trusted', trustedByRoutes);
app.use('/api/pbs', pbsRoutes);
app.use('/api/climate-intelligence', climateRoutes);
app.use('/api/advisory-board', advisoryBoardRoutes);
app.use('/api/stories', storyRoutes); // NEW

app.use('/api/pending-submissions', pendingRoutes);
app.use('/api/submission-links', submissionLinkRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/contact-forms', contactFormRoutes);
app.use('/api/testimonials', testimonialRoutes); // NEW
app.use('/api/projects', projectRoutes);


app.get('/', (req, res) => {
  res.send('GreonXpert API with Authentication & Real-time Socket.IO is running...');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO enabled for real-time updates`);
});

module.exports = { app, io, server };
