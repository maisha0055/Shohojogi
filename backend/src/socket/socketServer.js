const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');

let io = null;

// Store active workers by category
const activeWorkersByCategory = new Map(); // categoryId -> Set of worker socketIds
const workerSocketMap = new Map(); // socketId -> { userId, categoryId, socket }

const initializeSocket = (server) => {
  // CORS configuration for Socket.io
  const getSocketCorsOrigin = () => {
    // In development, allow all localhost ports
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return (origin, callback) => {
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      };
    }
    // In production, use specific URL
    return process.env.FRONTEND_URL || 'http://localhost:3000';
  };

  io = new Server(server, {
    cors: {
      origin: getSocketCorsOrigin(),
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      const userResult = await query(
        'SELECT id, role, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = decoded.id;
      socket.userRole = userResult.rows[0].role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.userRole})`);

    // If worker, register them as active
    if (socket.userRole === 'worker') {
      try {
        const workerResult = await query(
          `SELECT wp.service_category_id, wp.availability_status, wp.verification_status
           FROM worker_profiles wp 
           WHERE wp.user_id = $1`,
          [socket.userId]
        );

        if (workerResult.rows.length > 0) {
          const { service_category_id, availability_status, verification_status } = workerResult.rows[0];
          
          console.log(`[Socket] Worker ${socket.userId}: category=${service_category_id}, availability=${availability_status}, verified=${verification_status}`);
          
          if (verification_status === 'verified' && availability_status === 'available' && service_category_id) {
            // Ensure categoryId is stored as string for consistency
            const categoryId = String(service_category_id);
            
            if (!activeWorkersByCategory.has(categoryId)) {
              activeWorkersByCategory.set(categoryId, new Set());
            }
            
            activeWorkersByCategory.get(categoryId).add(socket.id);
            workerSocketMap.set(socket.id, {
              userId: socket.userId,
              categoryId: categoryId,
              socket: socket
            });

            const roomName = `category:${categoryId}`;
            socket.join(roomName);
            socket.join(`worker:${socket.userId}`);
            
            // Verify room membership
            const room = io.sockets.adapter.rooms.get(roomName);
            const roomSize = room ? room.size : 0;
            
            console.log(`[Socket] ✅ Worker ${socket.userId} registered for category ${categoryId} (socket.id: ${socket.id})`);
            console.log(`[Socket] Category ${categoryId} room: '${roomName}'`);
            console.log(`[Socket] Category ${categoryId} tracking: ${activeWorkersByCategory.get(categoryId).size} workers in map, ${roomSize} in room`);
          } else {
            console.log(`[Socket] ❌ Worker ${socket.userId} NOT registered: verified=${verification_status}, available=${availability_status}, category=${service_category_id}`);
          }
        } else {
          console.log(`[Socket] Worker ${socket.userId} has no profile`);
        }
      } catch (error) {
        console.error('[Socket] Error registering worker:', error);
      }
    }

    // User joins their personal room
    socket.join(`user:${socket.userId}`);

    // Send connection confirmation to worker
    if (socket.userRole === 'worker') {
      socket.emit('worker:connected', {
        message: 'Socket connected successfully',
        userId: socket.userId
      });
      console.log(`[Socket] Sent connection confirmation to worker ${socket.userId}`);
    }

    // Handle worker availability updates
    socket.on('worker:availability-update', async (data) => {
      try {
        const { availability_status, service_category_id } = data;
        
        console.log(`[Socket] Worker ${socket.userId} availability update: status=${availability_status}, category=${service_category_id}`);
        
        // Re-verify worker status from database to ensure accuracy
        const workerResult = await query(
          `SELECT wp.service_category_id, wp.availability_status, wp.verification_status
           FROM worker_profiles wp 
           WHERE wp.user_id = $1`,
          [socket.userId]
        );

        if (workerResult.rows.length === 0) {
          console.log(`[Socket] Worker ${socket.userId} has no profile, cannot update availability`);
          return;
        }

        const dbCategoryId = workerResult.rows[0].service_category_id;
        const dbAvailability = workerResult.rows[0].availability_status;
        const dbVerification = workerResult.rows[0].verification_status;

        // Use database values if provided values don't match (database is source of truth)
        const finalCategoryId = dbCategoryId || service_category_id;
        const finalAvailability = dbAvailability || availability_status;
        
        console.log(`[Socket] Worker ${socket.userId} DB status: category=${finalCategoryId}, availability=${finalAvailability}, verified=${dbVerification}`);
        
        // Remove from old category
        const oldWorkerData = workerSocketMap.get(socket.id);
        if (oldWorkerData) {
          const oldCategorySet = activeWorkersByCategory.get(oldWorkerData.categoryId);
          if (oldCategorySet) {
            oldCategorySet.delete(socket.id);
            socket.leave(`category:${oldWorkerData.categoryId}`);
            console.log(`[Socket] Worker ${socket.userId} removed from category ${oldWorkerData.categoryId}`);
          }
        }

        // Add to new category if verified, available, and has category
        if (dbVerification === 'verified' && finalAvailability === 'available' && finalCategoryId) {
          // Ensure categoryId is stored as string for consistency
          const categoryIdStr = String(finalCategoryId);
          
          if (!activeWorkersByCategory.has(categoryIdStr)) {
            activeWorkersByCategory.set(categoryIdStr, new Set());
          }
          
          activeWorkersByCategory.get(categoryIdStr).add(socket.id);
          workerSocketMap.set(socket.id, {
            userId: socket.userId,
            categoryId: categoryIdStr,
            socket: socket
          });

          const roomName = `category:${categoryIdStr}`;
          socket.join(roomName);
          
          // Verify room membership
          const room = io.sockets.adapter.rooms.get(roomName);
          const roomSize = room ? room.size : 0;
          
          console.log(`[Socket] ✅ Worker ${socket.userId} joined category ${categoryIdStr} (room: '${roomName}', room now has ${roomSize} workers)`);
          console.log(`[Socket] Category ${categoryIdStr} tracking: ${activeWorkersByCategory.get(categoryIdStr).size} workers in map`);
        } else {
          workerSocketMap.delete(socket.id);
          console.log(`[Socket] ❌ Worker ${socket.userId} NOT added: verified=${dbVerification}, available=${finalAvailability}, category=${finalCategoryId}`);
        }
      } catch (error) {
        console.error('[Socket] Error updating worker availability:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      const workerData = workerSocketMap.get(socket.id);
      if (workerData) {
        const categorySet = activeWorkersByCategory.get(workerData.categoryId);
        if (categorySet) {
          categorySet.delete(socket.id);
        }
        workerSocketMap.delete(socket.id);
      }
    });
  });

  return io;
};

// Broadcast call request to all active workers in a category
const broadcastCallRequest = async (categoryId, bookingData) => {
  if (!io) {
    console.error('[broadcastCallRequest] Socket.io not initialized');
    return { success: false, message: 'Socket server not initialized', workerCount: 0 };
  }

  // Ensure categoryId is a string for consistent room naming
  const categoryIdStr = String(categoryId);
  const activeWorkers = activeWorkersByCategory.get(categoryIdStr);
  const socketRoom = `category:${categoryIdStr}`;
  
  // Get all sockets in the room (even if not in our tracking map)
  const room = io.sockets.adapter.rooms.get(socketRoom);
  const roomSize = room ? room.size : 0;
  
  console.log(`[broadcastCallRequest] ==========================================`);
  console.log(`[broadcastCallRequest] Category ID: ${categoryId} (as string: ${categoryIdStr})`);
  console.log(`[broadcastCallRequest] Room name: '${socketRoom}'`);
  console.log(`[broadcastCallRequest] Active workers in map: ${activeWorkers ? activeWorkers.size : 0}`);
  console.log(`[broadcastCallRequest] Sockets in room '${socketRoom}': ${roomSize}`);
  console.log(`[broadcastCallRequest] All active categories in map:`, Array.from(activeWorkersByCategory.keys()));
  
  // Also check all rooms to see what category rooms exist
  const allRooms = Array.from(io.sockets.adapter.rooms.keys()).filter(roomName => roomName.startsWith('category:'));
  console.log(`[broadcastCallRequest] All category rooms in socket.io:`, allRooms);
  
  // If no workers in room, try to find workers by category ID in different formats
  if (roomSize === 0) {
    console.log(`[broadcastCallRequest] ⚠️ No workers in room '${socketRoom}', checking alternative formats...`);
    
    // Try numeric version if categoryId was a string
    if (typeof categoryId === 'string' && !isNaN(categoryId)) {
      const numericRoom = `category:${Number(categoryId)}`;
      const numericRoomObj = io.sockets.adapter.rooms.get(numericRoom);
      if (numericRoomObj && numericRoomObj.size > 0) {
        console.log(`[broadcastCallRequest] Found ${numericRoomObj.size} workers in numeric room '${numericRoom}'`);
        io.to(numericRoom).emit('worker:call-request', bookingData);
        console.log(`[broadcastCallRequest] Emitted to numeric room '${numericRoom}'`);
        return { 
          success: true, 
          message: `Request sent to ${numericRoomObj.size} active workers`,
          workerCount: numericRoomObj.size 
        };
      }
    }
    
    // Try string version if categoryId was a number
    if (typeof categoryId === 'number') {
      const stringRoom = `category:${String(categoryId)}`;
      const stringRoomObj = io.sockets.adapter.rooms.get(stringRoom);
      if (stringRoomObj && stringRoomObj.size > 0) {
        console.log(`[broadcastCallRequest] Found ${stringRoomObj.size} workers in string room '${stringRoom}'`);
        io.to(stringRoom).emit('worker:call-request', bookingData);
        console.log(`[broadcastCallRequest] Emitted to string room '${stringRoom}'`);
        return { 
          success: true, 
          message: `Request sent to ${stringRoomObj.size} active workers`,
          workerCount: stringRoomObj.size 
        };
      }
    }
  }
  
  // Emit to all workers in this category room
  io.to(socketRoom).emit('worker:call-request', bookingData);
  
  // Also log which sockets are in the room
  if (room) {
    const socketIds = Array.from(room);
    console.log(`[broadcastCallRequest] Sockets in room:`, socketIds.length);
    // Get worker user IDs from socket IDs
    socketIds.forEach(socketId => {
      const workerData = workerSocketMap.get(socketId);
      if (workerData) {
        console.log(`[broadcastCallRequest]   ✅ Socket ${socketId}: Worker ${workerData.userId} (category: ${workerData.categoryId})`);
      } else {
        console.log(`[broadcastCallRequest]   ⚠️ Socket ${socketId}: (not in workerSocketMap)`);
      }
    });
  } else {
    console.log(`[broadcastCallRequest] ⚠️ Room '${socketRoom}' does not exist`);
  }
  
  // Return the actual room size, not just tracked workers
  const notifiedCount = roomSize > 0 ? roomSize : (activeWorkers ? activeWorkers.size : 0);
  
  console.log(`[broadcastCallRequest] Emitted 'worker:call-request' to ${notifiedCount} workers in room '${socketRoom}'`);
  console.log(`[broadcastCallRequest] Booking data sent:`, {
    booking_id: bookingData.booking_id,
    image_count: bookingData.image_urls?.length || 0,
    service_description: bookingData.service_description?.substring(0, 50) + '...'
  });
  console.log(`[broadcastCallRequest] ==========================================`);
  
  return { 
    success: true, 
    message: `Request sent to ${notifiedCount} active workers`,
    workerCount: notifiedCount 
  };
};

// Notify specific user
const notifyUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

// Notify specific worker
const notifyWorker = (workerId, event, data) => {
  if (!io) return;
  io.to(`worker:${workerId}`).emit(event, data);
};

module.exports = {
  initializeSocket,
  broadcastCallRequest,
  notifyUser,
  notifyWorker,
  getIO: () => io
};

