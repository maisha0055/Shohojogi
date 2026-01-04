require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

// Dummy Users (Regular customers)
const dummyUsers = [
  {
    email: 'john.doe@example.com',
    password: 'User123',
    full_name: 'John Doe',
    phone: '+8801711111111',
    address: 'Dhanmondi, Dhaka',
    latitude: 23.7461,
    longitude: 90.3742,
    preferred_language: 'en'
  },
  {
    email: 'rahim@example.com',
    password: 'User123',
    full_name: 'আব্দুর রহিম',
    phone: '+8801722222222',
    address: 'মিরপুর, ঢাকা',
    latitude: 23.8223,
    longitude: 90.3654,
    preferred_language: 'bn'
  },
  {
    email: 'sara.ahmed@example.com',
    password: 'User123',
    full_name: 'Sara Ahmed',
    phone: '+8801733333333',
    address: 'Gulshan, Dhaka',
    latitude: 23.7808,
    longitude: 90.4126,
    preferred_language: 'en'
  },
  {
    email: 'fatima.khan@example.com',
    password: 'User123',
    full_name: 'Fatima Khan',
    phone: '+8801744441111',
    address: 'Banani, Dhaka',
    latitude: 23.7937,
    longitude: 90.4066,
    preferred_language: 'en'
  },
  {
    email: 'karim.uddin@example.com',
    password: 'User123',
    full_name: 'করিম উদ্দিন',
    phone: '+8801755551111',
    address: 'উত্তরা, ঢাকা',
    latitude: 23.8759,
    longitude: 90.3795,
    preferred_language: 'bn'
  },
  {
    email: 'alex.smith@example.com',
    password: 'User123',
    full_name: 'Alex Smith',
    phone: '+8801766661111',
    address: 'Mohammadpur, Dhaka',
    latitude: 23.7678,
    longitude: 90.3595,
    preferred_language: 'en'
  },
  {
    email: 'nazma.begum@example.com',
    password: 'User123',
    full_name: 'নাজমা বেগম',
    phone: '+8801777771111',
    address: 'বাশুন্ধারা, ঢাকা',
    latitude: 23.8223,
    longitude: 90.4254,
    preferred_language: 'bn'
  },
  {
    email: 'david.wilson@example.com',
    password: 'User123',
    full_name: 'David Wilson',
    phone: '+8801788881111',
    address: 'Khilgaon, Dhaka',
    latitude: 23.7521,
    longitude: 90.4282,
    preferred_language: 'en'
  }
];

// Dummy Workers
const dummyWorkers = [
  {
    email: 'karim.carpenter@example.com',
    password: 'Worker123',
    full_name: 'Karim Hossain',
    phone: '+8801744444444',
    address: 'Mirpur 10, Dhaka',
    latitude: 23.8070,
    longitude: 90.3688,
    category: 'Carpenter',
    experience_years: 8,
    hourly_rate: 500,
    bio: 'Expert carpenter with 8 years of experience in furniture making, repair, and custom woodwork. Available for all types of carpentry jobs.',
    skills: ['Furniture repair', 'Door installation', 'Cabinet making', 'Wood polishing'],
    average_rating: 4.8,
    total_reviews: 45,
    total_jobs_completed: 120,
    is_featured: true
  },
  {
    email: 'electrician.rahim@example.com',
    password: 'Worker123',
    full_name: 'Rahim Uddin',
    phone: '+8801755555555',
    address: 'Dhanmondi 27, Dhaka',
    latitude: 23.7463,
    longitude: 90.3786,
    category: 'Electrician',
    experience_years: 10,
    hourly_rate: 600,
    bio: 'Licensed electrician specializing in residential and commercial electrical work. Available 24/7 for emergency repairs.',
    skills: ['Wiring', 'Circuit breaker', 'Lighting installation', 'Panel repair'],
    average_rating: 4.8,
    total_reviews: 45,
    total_jobs_completed: 120,
    is_featured: true
  },
  {
    email: 'plumber.hasan@example.com',
    password: 'Worker123',
    full_name: 'Hasan Ali',
    phone: '+8801766666666',
    address: 'Banani, Dhaka',
    latitude: 23.7937,
    longitude: 90.4066,
    category: 'Plumber',
    experience_years: 6,
    hourly_rate: 450,
    bio: 'Professional plumber with expertise in pipe installation, drainage systems, and water heater repairs. Fast and reliable service.',
    skills: ['Pipe repair', 'Bathroom fixtures', 'Water pump', 'Drainage cleaning'],
    average_rating: 4.6,
    total_reviews: 38,
    total_jobs_completed: 95,
    is_featured: false
  },
  {
    email: 'mechanic.aslam@example.com',
    password: 'Worker123',
    full_name: 'Aslam Sheikh',
    phone: '+8801777777777',
    address: 'Mohammadpur, Dhaka',
    latitude: 23.7678,
    longitude: 90.3595,
    category: 'Mechanic',
    experience_years: 12,
    hourly_rate: 700,
    bio: 'Experienced auto mechanic specializing in both bikes and cars. Expert in engine repair, servicing, and diagnostics.',
    skills: ['Engine repair', 'Oil change', 'Brake service', 'AC repair'],
    average_rating: 4.6,
    total_reviews: 38,
    total_jobs_completed: 95,
    is_featured: false
  },
  {
    email: 'painter.jobayer@example.com',
    password: 'Worker123',
    full_name: 'Jobayer Islam',
    phone: '+8801788888888',
    address: 'Uttara, Dhaka',
    latitude: 23.8759,
    longitude: 90.3795,
    category: 'Painter',
    experience_years: 7,
    hourly_rate: 400,
    bio: 'Professional painter with 7 years of experience. Specializing in interior and exterior painting, wall textures, and color consulting.',
    skills: ['Interior painting', 'Exterior painting', 'Wall texture', 'Enamel work'],
    average_rating: 4.5,
    total_reviews: 25,
    total_jobs_completed: 60,
    is_featured: false
  },
  {
    email: 'ac.technician@example.com',
    password: 'Worker123',
    full_name: 'Farhan Ahmed',
    phone: '+8801799999999',
    address: 'Bashundhara, Dhaka',
    latitude: 23.8223,
    longitude: 90.4254,
    category: 'AC Technician',
    experience_years: 5,
    hourly_rate: 650,
    bio: 'Certified AC technician for installation, repair, and maintenance of all brands. Quick service guaranteed.',
    skills: ['AC installation', 'Gas refill', 'Compressor repair', 'Maintenance'],
    average_rating: 4.5,
    total_reviews: 25,
    total_jobs_completed: 60,
    is_featured: false
  },
  {
    email: 'cleaner.nasim@example.com',
    password: 'Worker123',
    full_name: 'Nasim Miah',
    phone: '+8801711122222',
    address: 'Khilgaon, Dhaka',
    latitude: 23.7521,
    longitude: 90.4282,
    category: 'Cleaning Service',
    experience_years: 4,
    hourly_rate: 350,
    bio: 'Professional cleaning service for homes and offices. Deep cleaning, regular maintenance, and move-in/out cleaning.',
    skills: ['Deep cleaning', 'Regular cleaning', 'Office cleaning', 'Bathroom cleaning'],
    average_rating: 4.5,
    total_reviews: 25,
    total_jobs_completed: 60,
    is_featured: false
  },
  {
    email: 'keymaker.alam@example.com',
    password: 'Worker123',
    full_name: 'Alam Sheikh',
    phone: '+8801722233333',
    address: 'Shyamoli, Dhaka',
    latitude: 23.7679,
    longitude: 90.3682,
    category: 'Key Maker',
    experience_years: 9,
    hourly_rate: 300,
    bio: 'Expert key maker and locksmith. Emergency lockout service, key duplication, and lock installation/repair.',
    skills: ['Key cutting', 'Lock repair', 'Emergency lockout', 'Security locks'],
    average_rating: 4.5,
    total_reviews: 25,
    total_jobs_completed: 60,
    is_featured: false
  },
  {
    email: 'gardener.habib@example.com',
    password: 'Worker123',
    full_name: 'Habib Rahman',
    phone: '+8801733344444',
    address: 'Gulshan, Dhaka',
    latitude: 23.7808,
    longitude: 90.4126,
    category: 'Gardener',
    experience_years: 6,
    hourly_rate: 400,
    bio: 'Professional gardener with expertise in garden maintenance, lawn care, and plant care. Available for residential and commercial projects.',
    skills: ['Garden maintenance', 'Lawn care', 'Plant care', 'Landscaping'],
    average_rating: 4.7,
    total_reviews: 32,
    total_jobs_completed: 85,
    is_featured: false
  },
  {
    email: 'mason.kamal@example.com',
    password: 'Worker123',
    full_name: 'Kamal Hossain',
    phone: '+8801744455555',
    address: 'Wari, Dhaka',
    latitude: 23.7104,
    longitude: 90.4074,
    category: 'Mason',
    experience_years: 11,
    hourly_rate: 550,
    bio: 'Experienced mason specializing in brick work, wall construction, and tiling. Quality work guaranteed.',
    skills: ['Brick work', 'Wall construction', 'Tiling', 'Plastering'],
    average_rating: 4.6,
    total_reviews: 40,
    total_jobs_completed: 110,
    is_featured: false
  },
  {
    email: 'welder.shamim@example.com',
    password: 'Worker123',
    full_name: 'Shamim Ahmed',
    phone: '+8801755566666',
    address: 'Tejgaon, Dhaka',
    latitude: 23.7596,
    longitude: 90.4000,
    category: 'Welder',
    experience_years: 7,
    hourly_rate: 500,
    bio: 'Professional welder for metal welding, gate repair, and grill work. Expert in all types of welding jobs.',
    skills: ['Metal welding', 'Gate repair', 'Grill work', 'Fabrication'],
    average_rating: 4.5,
    total_reviews: 28,
    total_jobs_completed: 75,
    is_featured: false
  },
  {
    email: 'cctv.tech@example.com',
    password: 'Worker123',
    full_name: 'Rashid Ali',
    phone: '+8801766677777',
    address: 'Dhanmondi, Dhaka',
    latitude: 23.7463,
    longitude: 90.3786,
    category: 'CCTV Technician',
    experience_years: 5,
    hourly_rate: 600,
    bio: 'Certified CCTV technician for installation and setup of security camera systems. Professional service for homes and businesses.',
    skills: ['CCTV installation', 'Security camera setup', 'System maintenance', 'Troubleshooting'],
    average_rating: 4.6,
    total_reviews: 35,
    total_jobs_completed: 90,
    is_featured: false
  },
  {
    email: 'pest.control@example.com',
    password: 'Worker123',
    full_name: 'Mizanur Rahman',
    phone: '+8801777788888',
    address: 'Mirpur, Dhaka',
    latitude: 23.8070,
    longitude: 90.3688,
    category: 'Pest Control',
    experience_years: 8,
    hourly_rate: 450,
    bio: 'Professional pest control service for homes and offices. Safe and effective pest removal, fumigation, and mosquito control.',
    skills: ['Pest removal', 'Fumigation', 'Mosquito control', 'Termite treatment'],
    average_rating: 4.7,
    total_reviews: 42,
    total_jobs_completed: 115,
    is_featured: false
  },
  {
    email: 'appliance.repair@example.com',
    password: 'Worker123',
    full_name: 'Tariqul Islam',
    phone: '+8801788899999',
    address: 'Banani, Dhaka',
    latitude: 23.7937,
    longitude: 90.4066,
    category: 'Appliance Repair',
    experience_years: 9,
    hourly_rate: 500,
    bio: 'Expert in repairing refrigerators, washing machines, ovens, and all home appliances. Quick and reliable service.',
    skills: ['Refrigerator repair', 'Washing machine repair', 'Oven repair', 'General appliance repair'],
    average_rating: 4.6,
    total_reviews: 38,
    total_jobs_completed: 100,
    is_featured: false
  },
  {
    email: 'tailor.rahima@example.com',
    password: 'Worker123',
    full_name: 'Rahima Begum',
    phone: '+8801799900000',
    address: 'Old Dhaka',
    latitude: 23.7104,
    longitude: 90.4074,
    category: 'Tailor',
    experience_years: 12,
    hourly_rate: 350,
    bio: 'Professional tailor with 12 years of experience. Specializing in clothes stitching, alteration, and custom tailoring.',
    skills: ['Clothes stitching', 'Alteration', 'Custom tailoring', 'Design consultation'],
    average_rating: 4.8,
    total_reviews: 50,
    total_jobs_completed: 130,
    is_featured: true
  }
];

async function seedUsers() {
  console.log('🌱 Seeding dummy users...\n');
  
  for (const userData of dummyUsers) {
    try {
      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [userData.email]);
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  User ${userData.full_name} already exists, updating...`);
        const hash = await bcrypt.hash(userData.password, 10);
        
        await query(
          `UPDATE users SET password = $1, full_name = $2, phone = $3, address = $4, 
           latitude = $5, longitude = $6, preferred_language = $7 WHERE email = $8`,
          [hash, userData.full_name, userData.phone, userData.address, 
           userData.latitude, userData.longitude, userData.preferred_language, userData.email]
        );
        
        console.log(`✅ Updated: ${userData.full_name}`);
      } else {
        const hash = await bcrypt.hash(userData.password, 10);
        
        await query(
          `INSERT INTO users (email, password, full_name, phone, role, address, 
           latitude, longitude, preferred_language, is_verified, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [userData.email, hash, userData.full_name, userData.phone, 'user',
           userData.address, userData.latitude, userData.longitude, 
           userData.preferred_language, true, true]
        );
        
        console.log(`✅ Created: ${userData.full_name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.full_name}:`, error.message);
    }
  }
  
  console.log('\n✅ User seeding completed!\n');
}

async function seedWorkers() {
  console.log('🌱 Seeding dummy workers...\n');
  
  for (const workerData of dummyWorkers) {
    try {
      // Get category ID
      const categoryResult = await query(
        'SELECT id FROM service_categories WHERE name_en = $1',
        [workerData.category]
      );
      
      if (categoryResult.rows.length === 0) {
        console.log(`⚠️  Category "${workerData.category}" not found, skipping ${workerData.full_name}`);
        continue;
      }
      
      const categoryId = categoryResult.rows[0].id;
      
      // Check if worker exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [workerData.email]);
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  Worker ${workerData.full_name} already exists, updating...`);
        const userId = existing.rows[0].id;
        const hash = await bcrypt.hash(workerData.password, 10);
        
        // Update user
        await query(
          `UPDATE users SET password = $1, full_name = $2, phone = $3, address = $4, 
           latitude = $5, longitude = $6, is_verified = TRUE WHERE id = $7`,
          [hash, workerData.full_name, workerData.phone, workerData.address, 
           workerData.latitude, workerData.longitude, userId]
        );
        
        // Check if worker profile exists
        const profileCheck = await query('SELECT id FROM worker_profiles WHERE user_id = $1', [userId]);
        
        if (profileCheck.rows.length > 0) {
          // Update existing worker profile
          await query(
            `UPDATE worker_profiles 
             SET service_category_id = $1, experience_years = $2, hourly_rate = $3, 
             bio = $4, skills = $5, availability_status = 'available', 
             verification_status = 'verified', average_rating = $6, 
             total_reviews = $7, total_jobs_completed = $8, is_featured = $9
             WHERE user_id = $10`,
            [categoryId, workerData.experience_years, workerData.hourly_rate,
             workerData.bio, workerData.skills, workerData.average_rating,
             workerData.total_reviews, workerData.total_jobs_completed, 
             workerData.is_featured, userId]
          );
        } else {
          // Create worker profile if it doesn't exist
          await query(
            `INSERT INTO worker_profiles (
              user_id, service_category_id, experience_years, hourly_rate, bio, skills,
              availability_status, verification_status, average_rating, total_reviews,
              total_jobs_completed, is_featured
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [userId, categoryId, workerData.experience_years, workerData.hourly_rate,
             workerData.bio, workerData.skills, 'available', 'verified',
             workerData.average_rating, workerData.total_reviews, 
             workerData.total_jobs_completed, workerData.is_featured]
          );
        }
        
        console.log(`✅ Updated: ${workerData.full_name} (${workerData.category})`);
      } else {
        // Create new worker
        const hash = await bcrypt.hash(workerData.password, 10);
        
        // Insert user
        const userResult = await query(
          `INSERT INTO users (email, password, full_name, phone, role, address, 
           latitude, longitude, is_verified) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [workerData.email, hash, workerData.full_name, workerData.phone, 'worker',
           workerData.address, workerData.latitude, workerData.longitude, true]
        );
        
        const userId = userResult.rows[0].id;
        
        // Insert worker profile
        await query(
          `INSERT INTO worker_profiles (
            user_id, service_category_id, experience_years, hourly_rate, bio, skills,
            availability_status, verification_status, average_rating, total_reviews,
            total_jobs_completed, is_featured
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [userId, categoryId, workerData.experience_years, workerData.hourly_rate,
           workerData.bio, workerData.skills, 'available', 'verified',
           workerData.average_rating, workerData.total_reviews, 
           workerData.total_jobs_completed, workerData.is_featured]
        );
        
        console.log(`✅ Created: ${workerData.full_name} (${workerData.category})`);
      }
    } catch (error) {
      console.error(`❌ Error creating worker ${workerData.full_name}:`, error.message);
    }
  }
  
  console.log('\n✅ Worker seeding completed!\n');
}

async function main() {
  try {
    console.log('🚀 Starting dummy data seeding...\n');
    console.log('='.repeat(60));
    
    await seedUsers();
    await seedWorkers();
    
    console.log('='.repeat(60));
    console.log('\n✅ All dummy data seeded successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('\n👥 Users (Password: User123):');
    dummyUsers.forEach(user => {
      console.log(`   - ${user.email}`);
    });
    console.log('\n👷 Workers (Password: Worker123):');
    dummyWorkers.forEach(worker => {
      console.log(`   - ${worker.email} (${worker.category})`);
    });
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error seeding dummy data:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



