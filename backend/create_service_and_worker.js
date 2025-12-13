const { pool } = require("./src/config/database");

(async () => {
  try {
    console.log("Ensuring service_categories table exists...");
    const sql1 = `
    CREATE TABLE IF NOT EXISTS service_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name_en VARCHAR(100) NOT NULL,
        name_bn VARCHAR(100) NOT NULL,
        description_en TEXT,
        description_bn TEXT,
        icon_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;
    await pool.query(sql1);
    console.log("service_categories ensured.");

    console.log("Ensuring worker_profiles table exists...");
    const sql2 = `
    CREATE TABLE IF NOT EXISTS worker_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_category_id UUID REFERENCES service_categories(id),
        experience_years INTEGER DEFAULT 0,
        hourly_rate DECIMAL(10, 2),
        bio TEXT,
        skills TEXT[],
        availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
        verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
        nid_number VARCHAR(50),
        nid_image_url VARCHAR(500),
        extracted_nid_data JSONB,
        average_rating DECIMAL(3, 2) DEFAULT 0,
        total_reviews INTEGER DEFAULT 0,
        total_jobs_completed INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;
    await pool.query(sql2);
    console.log("worker_profiles ensured.");
  } catch (err) {
    console.error("Error ensuring tables:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
