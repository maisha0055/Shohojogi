const { pool } = require("./src/config/database");

(async () => {
  try {
    console.log("Creating worker_profiles table if not exists...");
    const sql = `
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
    await pool.query(sql);
    console.log("worker_profiles table ensured.");
  } catch (err) {
    console.error("Error creating worker_profiles:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
