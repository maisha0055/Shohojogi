const { pool } = require('./src/config/database');

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedBookingsAndReviews() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Fetching users and workers...');
    
    // Get regular users
    const usersResult = await client.query(`
      SELECT id, full_name, email 
      FROM users 
      WHERE role = 'user' 
      LIMIT 10
    `);
    const users = usersResult.rows;
    
    // Get workers with their profiles
    const workersResult = await client.query(`
      SELECT u.id as user_id, u.full_name, u.email, wp.id as profile_id, wp.service_category_id
      FROM users u
      JOIN worker_profiles wp ON u.id = wp.user_id
      WHERE u.role = 'worker'
    `);
    const workers = workersResult.rows;
    
    if (users.length === 0 || workers.length === 0) {
      console.log('❌ Need users and workers. Run db:seed:workers first.');
      return;
    }
    
    console.log(`✓ Found ${users.length} users and ${workers.length} workers\n`);
    
    const bookingStatuses = ['completed', 'completed', 'completed', 'completed', 'in_progress', 'accepted', 'pending'];
    const locations = [
      { area: 'Dhanmondi, Dhaka', lat: 23.7461, lng: 90.3742 },
      { area: 'Gulshan, Dhaka', lat: 23.7808, lng: 90.4126 },
      { area: 'Banani, Dhaka', lat: 23.7937, lng: 90.4066 },
      { area: 'Uttara, Dhaka', lat: 23.8759, lng: 90.3795 },
      { area: 'Mirpur, Dhaka', lat: 23.8070, lng: 90.3688 }
    ];
    
    // Create bookings
    console.log('📋 Creating bookings...');
    const bookings = [];
    
    for (let i = 0; i < 30; i++) {
      const user = getRandomElement(users);
      const worker = getRandomElement(workers);
      const status = getRandomElement(bookingStatuses);
      const location = getRandomElement(locations);
      const bookingType = getRandomElement(['instant', 'scheduled']);
      const paymentMethod = getRandomElement(['cash', 'online']);
      
      // Generate booking number
      const bookingNumber = `BK${Date.now()}${getRandomInt(1000, 9999)}`;
      
      // Random date (past 30 days to future 7 days)
      const daysAgo = getRandomInt(-30, 7);
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + daysAgo);
      scheduledDate.setHours(getRandomInt(9, 18), getRandomInt(0, 59), 0, 0);
      
      const estimatedPrice = getRandomInt(500, 5000);
      const finalPrice = status === 'completed' ? estimatedPrice + getRandomInt(-200, 500) : null;
      
      // Format date and time separately
      const scheduledTime = `${getRandomInt(9, 18).toString().padStart(2, '0')}:${getRandomInt(0, 59).toString().padStart(2, '0')}:00`;
      const scheduledDateOnly = scheduledDate.toISOString().split('T')[0];
      
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          booking_number, user_id, worker_id, service_category_id, booking_type,
          scheduled_date, scheduled_time, service_location, location_latitude, location_longitude, 
          service_description, estimated_price, final_price, status, payment_method, payment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, booking_number, status, final_price, user_id, worker_id`,
        [
          bookingNumber,
          user.id,
          worker.user_id,
          worker.service_category_id,
          bookingType,
          scheduledDateOnly,
          scheduledTime,
          location.area,
          location.lat,
          location.lng,
          `Need service at ${location.area}. Please contact me for details.`,
          estimatedPrice,
          finalPrice,
          status,
          paymentMethod,
          status === 'completed' ? (paymentMethod === 'online' ? 'paid' : 'pending') : 'pending',
          scheduledDate
        ]
      );
      
      bookings.push(bookingResult.rows[0]);
    }
    
    console.log(`✓ Created ${bookings.length} bookings`);
    
    // Create reviews for completed bookings
    console.log('\n📋 Creating reviews...');
    let reviewsCreated = 0;
    
    const completedBookings = bookings.filter(b => b.status === 'completed' && b.final_price);
    
    for (const booking of completedBookings.slice(0, 20)) {
      // 90% chance of creating a review
      if (Math.random() > 0.1) {
        const rating = getRandomInt(3, 5); // Mostly positive reviews
        const reviews = [
          'Excellent service! Very professional and on time.',
          'Good work, satisfied with the service.',
          'Great experience, highly recommended!',
          'The worker was skilled and completed the job perfectly.',
          'Very helpful and knowledgeable. Will hire again.',
          'Quality work, worth the price.',
          'Prompt service, good communication throughout.',
          'Professional and courteous worker.',
          'Exceeded my expectations. Great job!',
          'Fast and efficient service.'
        ];
        
        const reviewText = getRandomElement(reviews);
        
        // Get the booking details to extract user_id and worker_id
        const bookingDetails = await client.query(
          'SELECT user_id, worker_id, created_at FROM bookings WHERE id = $1',
          [booking.id]
        );
        
        if (bookingDetails.rows.length > 0) {
          const bookingData = bookingDetails.rows[0];
          await client.query(
            `INSERT INTO reviews (
              booking_id, user_id, worker_id, rating, comment, is_fake, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              booking.id,
              bookingData.user_id,
              bookingData.worker_id,
              rating,
              reviewText,
              false,
              new Date(new Date(bookingData.created_at).getTime() + 3600000) // 1 hour after booking
            ]
          );
        }
        
        reviewsCreated++;
      }
    }
    
    console.log(`✓ Created ${reviewsCreated} reviews`);
    
    // Create some messages for active bookings
    console.log('\n📋 Creating chat messages...');
    const activeBookings = bookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status));
    let messagesCreated = 0;
    
    for (const booking of activeBookings.slice(0, 10)) {
      const messages = [
        'Hello, when can you come?',
        'I need this done urgently.',
        'What is your estimated arrival time?',
        'Thank you for accepting my booking.',
        'Can we reschedule to tomorrow?',
        'The address is correct, please confirm.',
        'Looking forward to your service.'
      ];
      
      // User sends message
      await client.query(
        `INSERT INTO messages (booking_id, sender_id, receiver_id, message_text, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          booking.id,
          booking.user_id,
          booking.worker_id,
          getRandomElement(messages),
          new Date()
        ]
      );
      
      // Worker replies
      await client.query(
        `INSERT INTO messages (booking_id, sender_id, receiver_id, message_text, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          booking.id,
          booking.worker_id,
          booking.user_id,
          'Thank you for your message. I will be there on time.',
          new Date(Date.now() + 60000) // 1 minute later
        ]
      );
      
      messagesCreated += 2;
    }
    
    console.log(`✓ Created ${messagesCreated} chat messages`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully seeded bookings and reviews!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Bookings created: ${bookings.length}`);
    console.log(`   - Reviews created: ${reviewsCreated}`);
    console.log(`   - Messages created: ${messagesCreated}`);
    console.log(`   - Completed bookings: ${completedBookings.length}`);
    console.log(`   - Active bookings: ${activeBookings.length}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedBookingsAndReviews().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

