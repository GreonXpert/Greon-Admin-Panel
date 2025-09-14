// socket/socketHandlers.js
const Story = require('../models/Story');

class SocketHandlers {
  static initializeSocket(io) {
    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join user to story rooms for real-time updates
      socket.on('join:story', (storyId) => {
        socket.join(`story:${storyId}`);
        console.log(`User ${socket.id} joined story room: ${storyId}`);
      });

      socket.on('leave:story', (storyId) => {
        socket.leave(`story:${storyId}`);
        console.log(`User ${socket.id} left story room: ${storyId}`);
      });

      // Join category rooms
      socket.on('join:category', (category) => {
        socket.join(`category:${category}`);
        console.log(`User ${socket.id} joined category room: ${category}`);
      });

      // Real-time story viewing
      socket.on('story:view', async (data) => {
        try {
          const { storyId } = data;
          const story = await Story.findById(storyId);
          
          if (story) {
            // Update view count for videos
            if (story.category === 'Video') {
              await story.incrementViews();
            }
            
            // Broadcast to story room
            io.to(`story:${storyId}`).emit('story:viewUpdate', {
              storyId,
              views: story.views,
              timestamp: new Date()
            });

            // Broadcast to category room
            io.to(`category:${story.category}`).emit('story:activity', {
              type: 'view',
              storyId,
              title: story.title,
              category: story.category,
              timestamp: new Date()
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to track view' });
        }
      });

      // Real-time download tracking
      socket.on('story:download', async (data) => {
        try {
          const { storyId } = data;
          const story = await Story.findById(storyId);
          
          if (story && story.category === 'Resources') {
            await story.incrementDownloads();
            
            // Broadcast to story room
            io.to(`story:${storyId}`).emit('story:downloadUpdate', {
              storyId,
              downloadCount: story.downloadCount,
              timestamp: new Date()
            });

            // Broadcast to category room
            io.to(`category:Resources`).emit('story:activity', {
              type: 'download',
              storyId,
              title: story.title,
              downloadCount: story.downloadCount,
              timestamp: new Date()
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to track download' });
        }
      });

      // Real-time like functionality
      socket.on('story:like', async (data) => {
        try {
          const { storyId, userId } = data;
          const story = await Story.findByIdAndUpdate(
            storyId,
            { $inc: { likes: 1 } },
            { new: true }
          );

          if (story) {
            // Broadcast to story room
            io.to(`story:${storyId}`).emit('story:likeUpdate', {
              storyId,
              likes: story.likes,
              userId,
              timestamp: new Date()
            });

            // Broadcast to category room
            io.to(`category:${story.category}`).emit('story:activity', {
              type: 'like',
              storyId,
              title: story.title,
              likes: story.likes,
              timestamp: new Date()
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to like story' });
        }
      });

      // Real-time commenting
      socket.on('story:comment', async (data) => {
        try {
          const { storyId, user, message } = data;
          const story = await Story.findByIdAndUpdate(
            storyId,
            {
              $push: {
                comments: {
                  user,
                  message,
                  date: new Date()
                }
              }
            },
            { new: true }
          );

          if (story) {
            const newComment = story.comments[story.comments.length - 1];
            
            // Broadcast to story room
            io.to(`story:${storyId}`).emit('story:newComment', {
              storyId,
              comment: newComment,
              timestamp: new Date()
            });

            // Broadcast to category room
            io.to(`category:${story.category}`).emit('story:activity', {
              type: 'comment',
              storyId,
              title: story.title,
              user,
              message: message.substring(0, 50) + '...',
              timestamp: new Date()
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to add comment' });
        }
      });

      // Admin notifications for new stories
      socket.on('join:admin', () => {
        socket.join('admin');
        console.log(`Admin user ${socket.id} joined admin room`);
      });

      // Send live statistics
      socket.on('request:stats', async () => {
        try {
          const stats = await this.getLiveStats();
          socket.emit('stats:update', stats);
        } catch (error) {
          socket.emit('error', { message: 'Failed to get stats' });
        }
      });

      // Handle typing indicators for comments
      socket.on('comment:typing', (data) => {
        socket.to(`story:${data.storyId}`).emit('comment:userTyping', {
          storyId: data.storyId,
          user: data.user,
          isTyping: data.isTyping
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });

      // Send welcome message with current stats
      this.sendWelcomeStats(socket);
    });

    return io;
  }

  // Get live statistics
  static async getLiveStats() {
    const totalStories = await Story.countDocuments({ status: 'published' });
    const totalViews = await Story.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, total: { $sum: '$analytics.impressions' } } }
    ]);

    const recentActivity = await Story.find({ status: 'published' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title category updatedAt');

    return {
      totalStories,
      totalViews: totalViews[0]?.total || 0,
      recentActivity,
      timestamp: new Date()
    };
  }

  // Send welcome statistics to new connections
  static async sendWelcomeStats(socket) {
    try {
      const stats = await this.getLiveStats();
      socket.emit('welcome:stats', stats);
    } catch (error) {
      console.error('Failed to send welcome stats:', error);
    }
  }

  // Broadcast system-wide notifications
  static broadcastNotification(io, notification) {
    io.emit('system:notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  // Broadcast new story to all users
  static broadcastNewStory(io, story) {
    // Emit to all users
    io.emit('story:new', {
      story: {
        _id: story._id,
        title: story.title,
        category: story.category,
        featured: story.featured,
        image: story.image
      },
      timestamp: new Date()
    });

    // Emit to specific category room
    io.to(`category:${story.category}`).emit('category:newStory', {
      story,
      timestamp: new Date()
    });

    // Emit to admin room
    io.to('admin').emit('admin:newStory', {
      story,
      timestamp: new Date()
    });
  }
}

module.exports = SocketHandlers;
