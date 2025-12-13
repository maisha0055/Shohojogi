const bcrypt = require("bcrypt");
const { pool } = require("./src/config/database");

// Bangladeshi names for realistic data
const bangladeshiFirstNames = [
  "Karim",
  "Rahim",
  "Hasan",
  "Ali",
  "Aslam",
  "Jobayer",
  "Kamal",
  "Jamal",
  "Rafiq",
  "Salam",
  "Shamim",
  "Hamid",
  "Babul",
  "Saju",
  "Mizan",
  "Sohel",
  "Nasir",
  "Firoz",
  "Tarek",
  "Sakib",
  "Rifat",
  "Mahmud",
  "Shahin",
  "Arif",
  "Monir",
  "Fahim",
  "Tanvir",
  "Rony",
  "Raju",
  "Nurul",
  "Fatema",
  "Ayesha",
  "Rokeya",
  "Nargis",
  "Sabina",
  "Tasnim",
  "Sharmin",
  "Jahanara",
  "Rashida",
  "Mahmuda",
];

const bangladeshiLastNames = [
  "Hossain",
  "Uddin",
  "Ali",
  "Rahman",
  "Ahmed",
  "Islam",
  "Sheikh",
  "Khan",
  "Miah",
  "Molla",
  "Biswas",
  "Sarkar",
  "Chowdhury",
  "Roy",
  "Das",
  "Mondal",
  "Shikder",
  "Mia",
  "Talukder",
  "Karim",
];

const locations = [
  { area: "Dhanmondi, Dhaka", lat: 23.7461, lng: 90.3742 },
  { area: "Gulshan, Dhaka", lat: 23.7808, lng: 90.4126 },
  { area: "Banani, Dhaka", lat: 23.7937, lng: 90.4066 },
  { area: "Uttara, Dhaka", lat: 23.8759, lng: 90.3795 },
  { area: "Mirpur, Dhaka", lat: 23.807, lng: 90.3688 },
  { area: "Mohammadpur, Dhaka", lat: 23.7678, lng: 90.3595 },
  { area: "Wari, Dhaka", lat: 23.7104, lng: 90.4074 },
  { area: "Old Dhaka", lat: 23.7104, lng: 90.4074 },
  { area: "Tejgaon, Dhaka", lat: 23.7629, lng: 90.3977 },
  { area: "Shyamoli, Dhaka", lat: 23.7726, lng: 90.3587 },
];

// Worker skills by category
const skillsByCategory = {
  Carpenter: [
    "Furniture Repair",
    "Door Installation",
    "Window Fixing",
    "Cabinet Making",
    "Wood Polishing",
  ],
  Electrician: [
    "Wiring",
    "Fixture Installation",
    "Electrical Repair",
    "Panel Work",
    "Circuit Troubleshooting",
  ],
  Plumber: [
    "Pipe Repair",
    "Drainage",
    "Water Supply",
    "Faucet Installation",
    "Leak Detection",
  ],
  Mechanic: [
    "Engine Repair",
    "Brake Service",
    "AC Service",
    "Battery Replacement",
    "Oil Change",
  ],
  Painter: [
    "Wall Painting",
    "Interior Design",
    "Color Consultation",
    "Wallpaper",
    "Texture Work",
  ],
  "AC Technician": [
    "AC Installation",
    "AC Repair",
    "Gas Filling",
    "Cleaning",
    "Maintenance",
  ],
  "Cleaning Service": [
    "Deep Cleaning",
    "Office Cleaning",
    "Carpet Cleaning",
    "Window Cleaning",
    "Kitchen Cleaning",
  ],
  "Key Maker": [
    "Key Duplication",
    "Lock Repair",
    "Lock Installation",
    "Lockout Service",
    "Safe Opening",
  ],
  Gardener: [
    "Garden Maintenance",
    "Lawn Care",
    "Plant Care",
    "Pruning",
    "Fertilizing",
  ],
  Mason: [
    "Brick Work",
    "Wall Construction",
    "Tiling",
    "Plastering",
    "Renovation",
  ],
  Welder: [
    "Metal Welding",
    "Gate Repair",
    "Grill Work",
    "Fence Installation",
    "Metal Fabrication",
  ],
  "CCTV Technician": [
    "CCTV Installation",
    "Camera Setup",
    "DVR Configuration",
    "Maintenance",
    "Troubleshooting",
  ],
  "Pest Control": [
    "Pest Removal",
    "Fumigation",
    "Mosquito Control",
    "Termite Treatment",
    "Rodent Control",
  ],
  "Appliance Repair": [
    "Refrigerator Repair",
    "Washing Machine",
    "Oven Repair",
    "Microwave",
    "Dishwasher",
  ],
  Tailor: [
    "Clothes Stitching",
    "Alteration",
    "Custom Tailoring",
    "Design",
    "Embroidery",
  ],
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedWorkers() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("🔄 Fetching service categories...");
    const categoriesResult = await client.query(
      "SELECT id, name_en FROM service_categories WHERE is_active = true"
    );
    const categories = categoriesResult.rows;

    if (categories.length === 0) {
      console.log(
        "❌ No service categories found. Please run seed.sql first to add categories."
      );
      return;
    }

    console.log(`✓ Found ${categories.length} service categories\n`);

    // Hash password once for all workers (using a simple password: Worker123)
    const defaultPassword = "Worker123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let totalWorkers = 0;
    const createdWorkers = [];

    // Create 3-5 workers per category
    for (const category of categories) {
      const categoryName = category.name_en;
      const workerCount = getRandomInt(3, 5);
      const skills = skillsByCategory[categoryName] || [
        "General Service",
        "Expert Service",
      ];

      console.log(`📋 Creating ${workerCount} workers for ${categoryName}...`);

      for (let i = 0; i < workerCount; i++) {
        const firstName = getRandomElement(bangladeshiFirstNames);
        const lastName = getRandomElement(bangladeshiLastNames);
        const fullName = `${firstName} ${lastName}`;
        const location = getRandomElement(locations);
        const phone = `+8801${getRandomInt(3, 9)}${getRandomInt(
          100000000,
          999999999
        )}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${categoryName
          .toLowerCase()
          .replace(/\s+/g, "")}${i}@example.com`;

        // Create user account
        const userResult = await client.query(
          `INSERT INTO users (email, password, full_name, phone, role, address, latitude, longitude, is_verified, is_active, preferred_language)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            email,
            hashedPassword,
            fullName,
            phone,
            "worker",
            location.area,
            location.lat,
            location.lng,
            true, // verified
            true, // active
            Math.random() > 0.5 ? "en" : "bn",
          ]
        );

        const userId = userResult.rows[0].id;

        // Create worker profile
        const experienceYears = getRandomInt(2, 15);
        const hourlyRate = getRandomInt(300, 1500);
        const availabilityStatus = getRandomElement([
          "available",
          "available",
          "available",
          "busy",
        ]); // Mostly available
        const verificationStatus = getRandomElement([
          "verified",
          "verified",
          "verified",
          "pending",
        ]); // Mostly verified
        const selectedSkills = skills
          .sort(() => 0.5 - Math.random())
          .slice(0, getRandomInt(2, 4));

        await client.query(
          `INSERT INTO worker_profiles (
            user_id, service_category_id, experience_years, hourly_rate, bio, skills,
            availability_status, verification_status, average_rating, total_reviews, total_jobs_completed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            userId,
            category.id,
            experienceYears,
            hourlyRate,
            `Experienced ${categoryName.toLowerCase()} with ${experienceYears} years of experience. Specialized in ${selectedSkills
              .slice(0, 2)
              .join(" and ")}.`,
            selectedSkills,
            availabilityStatus,
            verificationStatus,
            (Math.random() * 2 + 3).toFixed(2), // Rating between 3.0 and 5.0
            getRandomInt(5, 50),
            getRandomInt(10, 100),
          ]
        );

        createdWorkers.push({
          name: fullName,
          category: categoryName,
          email,
          phone,
        });
        totalWorkers++;
      }
    }

    // Create some regular users
    console.log("\n📋 Creating regular users...");
    const userPassword = await bcrypt.hash("User123", 10);
    const regularUsers = [
      {
        name: "Rashid Ahmed",
        email: "rashid@example.com",
        phone: "+8801712345678",
      },
      {
        name: "Fatema Begum",
        email: "fatema@example.com",
        phone: "+8801712345679",
      },
      {
        name: "Tarek Rahman",
        email: "tarek@example.com",
        phone: "+8801712345680",
      },
      {
        name: "Nargis Khatun",
        email: "nargis@example.com",
        phone: "+8801712345681",
      },
      {
        name: "Shamim Hossain",
        email: "shamim@example.com",
        phone: "+8801712345682",
      },
    ];

    for (const user of regularUsers) {
      const location = getRandomElement(locations);
      await client.query(
        `INSERT INTO users (email, password, full_name, phone, role, address, latitude, longitude, is_verified, is_active, preferred_language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (email) DO NOTHING`,
        [
          user.email,
          userPassword,
          user.name,
          user.phone,
          "user",
          location.area,
          location.lat,
          location.lng,
          true,
          true,
          Math.random() > 0.5 ? "en" : "bn",
        ]
      );
    }
    console.log(`✓ Created ${regularUsers.length} regular users`);

    await client.query("COMMIT");

    console.log("\n✅ Successfully seeded workers data!");
    console.log(`\n📊 Summary:`);
    console.log(`   - Total workers created: ${totalWorkers}`);
    console.log(`   - Regular users created: ${regularUsers.length}`);
    console.log(`   - Categories covered: ${categories.length}\n`);

    console.log("🔐 Default passwords:");
    console.log("   - Workers: Worker123");
    console.log("   - Users: User123\n");

    console.log("📝 Sample workers created:");
    createdWorkers.slice(0, 10).forEach((worker) => {
      console.log(`   - ${worker.name} (${worker.category}) - ${worker.email}`);
    });
    if (createdWorkers.length > 10) {
      console.log(`   ... and ${createdWorkers.length - 10} more workers\n`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed
seedWorkers().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
