const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client can remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Test database connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper function to get a client for transactions
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds for transactions
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  // Ensure timeout is cleared when client is released
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
};

// Function to ensure booking_images and worker_estimates tables exist
const ensureInstantCallTables = async () => {
  try {
    // Check if booking_images table exists
    const bookingImagesCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'booking_images'
      )
    `);

    if (!bookingImagesCheck.rows[0].exists) {
      console.log('⚠ Creating booking_images table for instant call feature...');
      await query(`
        CREATE TABLE booking_images (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          image_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_booking_images_booking_id ON booking_images(booking_id)`);
      console.log('✓ Successfully created booking_images table');
    } else {
      console.log('✓ booking_images table already exists');
    }

    // Check if worker_estimates table exists
    const workerEstimatesCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'worker_estimates'
      )
    `);

    if (!workerEstimatesCheck.rows[0].exists) {
      console.log('⚠ Creating worker_estimates table for instant call feature...');
      await query(`
        CREATE TABLE worker_estimates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          estimated_price DECIMAL(10, 2) NOT NULL,
          note TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(booking_id, worker_id)
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_estimates_booking_id ON worker_estimates(booking_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_estimates_worker_id ON worker_estimates(worker_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_estimates_status ON worker_estimates(status)`);
      console.log('✓ Successfully created worker_estimates table');
    } else {
      console.log('✓ worker_estimates table already exists');
    }
  } catch (error) {
    console.error('Error creating instant call tables:', error);
    console.log('⚠ Warning: Could not create booking_images or worker_estimates tables. Please run migration manually.');
  }
};

// Function to ensure NID verification tables exist
const ensureNIDVerificationTables = async () => {
  try {
    // Check if nid_verifications table exists
    const nidVerificationsCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nid_verifications'
      )
    `);

    if (!nidVerificationsCheck.rows[0].exists) {
      console.log('⚠ Creating nid_verifications table for NID verification feature...');
      
      // Create nid_verifications table
      await query(`
        CREATE TABLE nid_verifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_consent BOOLEAN DEFAULT FALSE,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          nid_image_url VARCHAR(500),
          nid_image_path VARCHAR(500),
          extracted_data JSONB,
          verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'auto_rejected')),
          extraction_confidence INTEGER,
          image_quality VARCHAR(20) CHECK (image_quality IN ('Good', 'Average', 'Poor')),
          tampering_suspected BOOLEAN DEFAULT FALSE,
          language_detected VARCHAR(20),
          name_match BOOLEAN,
          nid_format_valid BOOLEAN,
          age_valid BOOLEAN,
          nid_unique BOOLEAN,
          reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
          reviewed_at TIMESTAMP,
          rejection_reason TEXT,
          admin_notes TEXT,
          auto_rejection_reason TEXT,
          auto_approval_reason TEXT,
          selfie_image_url TEXT,
          selfie_descriptor JSONB,
          face_verification_results JSONB,
          face_match_passed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verifications_user_id ON nid_verifications(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verifications_status ON nid_verifications(verification_status)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verifications_submitted_at ON nid_verifications(submitted_at)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verifications_nid_number ON nid_verifications((extracted_data->>'nid_number'))`);
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verifications_face_match ON nid_verifications(face_match_passed) WHERE face_match_passed IS NOT NULL`);
      
      console.log('✓ Successfully created nid_verifications table');
    } else {
      console.log('✓ nid_verifications table already exists');
      
      // Check and add face verification columns if they don't exist
      const faceVerificationColumns = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'nid_verifications' 
        AND column_name IN ('selfie_image_url', 'selfie_descriptor', 'face_verification_results', 'face_match_passed')
      `);
      
      const existingColumns = faceVerificationColumns.rows.map(row => row.column_name);
      
      if (!existingColumns.includes('selfie_image_url')) {
        console.log('⚠ Adding face verification columns to nid_verifications table...');
        await query(`ALTER TABLE nid_verifications ADD COLUMN IF NOT EXISTS selfie_image_url TEXT`);
        await query(`ALTER TABLE nid_verifications ADD COLUMN IF NOT EXISTS selfie_descriptor JSONB`);
        await query(`ALTER TABLE nid_verifications ADD COLUMN IF NOT EXISTS face_verification_results JSONB`);
        await query(`ALTER TABLE nid_verifications ADD COLUMN IF NOT EXISTS face_match_passed BOOLEAN DEFAULT FALSE`);
        await query(`CREATE INDEX IF NOT EXISTS idx_nid_verifications_face_match ON nid_verifications(face_match_passed) WHERE face_match_passed IS NOT NULL`);
        console.log('✓ Successfully added face verification columns');
      }
      
      // Check and add auto_approval_reason if it doesn't exist
      const autoApprovalCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'nid_verifications' 
        AND column_name = 'auto_approval_reason'
      `);
      
      if (autoApprovalCheck.rows.length === 0) {
        console.log('⚠ Adding auto_approval_reason column to nid_verifications table...');
        await query(`ALTER TABLE nid_verifications ADD COLUMN IF NOT EXISTS auto_approval_reason TEXT`);
        console.log('✓ Successfully added auto_approval_reason column');
      }
    }

    // Check if nid_verification_logs table exists
    const logsCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nid_verification_logs'
      )
    `);

    if (!logsCheck.rows[0].exists) {
      console.log('⚠ Creating nid_verification_logs table...');
      await query(`
        CREATE TABLE nid_verification_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          verification_id UUID REFERENCES nid_verifications(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
          details JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verification_logs_verification_id ON nid_verification_logs(verification_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_nid_verification_logs_user_id ON nid_verification_logs(user_id)`);
      console.log('✓ Successfully created nid_verification_logs table');
    } else {
      console.log('✓ nid_verification_logs table already exists');
    }

    // Check and add nid_verification_status column to users table if it doesn't exist
    const userStatusCheck = await query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'nid_verification_status'
    `);

    if (userStatusCheck.rows.length === 0) {
      console.log('⚠ Adding nid_verification_status column to users table...');
      await query(`
        ALTER TABLE users 
        ADD COLUMN nid_verification_status VARCHAR(20) DEFAULT 'not_submitted' 
        CHECK (nid_verification_status IN ('not_submitted', 'pending', 'approved', 'rejected'))
      `);
      console.log('✓ Successfully added nid_verification_status column');
    } else {
      // Check if column has a default value, if not, add it
      const columnInfo = userStatusCheck.rows[0];
      if (!columnInfo.column_default && columnInfo.is_nullable === 'NO') {
        console.log('⚠ nid_verification_status column exists but has no default. Adding default value...');
        try {
          await query(`
            ALTER TABLE users 
            ALTER COLUMN nid_verification_status SET DEFAULT 'not_submitted'
          `);
          // Update existing NULL values
          await query(`
            UPDATE users 
            SET nid_verification_status = 'not_submitted' 
            WHERE nid_verification_status IS NULL
          `);
          console.log('✓ Successfully added default value to nid_verification_status column');
        } catch (error) {
          console.error('Error setting default for nid_verification_status:', error);
        }
      }
    }

    // Check and add nid_number_encrypted column to users table if it doesn't exist
    const nidNumberCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'nid_number_encrypted'
    `);

    if (nidNumberCheck.rows.length === 0) {
      console.log('⚠ Adding nid_number_encrypted column to users table...');
      await query(`ALTER TABLE users ADD COLUMN nid_number_encrypted TEXT`);
      console.log('✓ Successfully added nid_number_encrypted column');
    }

    // Check and add loyalty_tier column to users table if it doesn't exist
    const loyaltyTierCheck = await query(`
      SELECT column_name, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'loyalty_tier'
    `);

    if (loyaltyTierCheck.rows.length === 0) {
      console.log('⚠ Adding loyalty_tier column to users table...');
      await query(`
        ALTER TABLE users 
        ADD COLUMN loyalty_tier VARCHAR(20) DEFAULT 'Bronze' 
        CHECK (loyalty_tier IN ('Bronze', 'Silver', 'Gold'))
      `);
      // Update existing users to have Bronze tier
      await query(`
        UPDATE users 
        SET loyalty_tier = 'Bronze' 
        WHERE loyalty_tier IS NULL
      `);
      console.log('✓ Successfully added loyalty_tier column');
    } else {
      // Ensure existing users have a tier
      await query(`
        UPDATE users 
        SET loyalty_tier = 'Bronze' 
        WHERE loyalty_tier IS NULL
      `);
    }

    // Create or replace the trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_user_verification_status()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.verification_status = 'approved' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'approved') THEN
          UPDATE users 
          SET nid_verification_status = 'approved',
              is_verified = TRUE,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.user_id;
        ELSIF NEW.verification_status = 'rejected' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'rejected') THEN
          UPDATE users 
          SET nid_verification_status = 'rejected',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.user_id;
        ELSIF NEW.verification_status = 'pending' THEN
          UPDATE users 
          SET nid_verification_status = 'pending',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = NEW.user_id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create trigger if it doesn't exist
    await query(`
      DROP TRIGGER IF EXISTS trigger_update_user_verification_status ON nid_verifications
    `);
    await query(`
      CREATE TRIGGER trigger_update_user_verification_status
        AFTER UPDATE OF verification_status ON nid_verifications
        FOR EACH ROW
        EXECUTE FUNCTION update_user_verification_status()
    `);

  } catch (error) {
    console.error('Error creating NID verification tables:', error);
    console.log('⚠ Warning: Could not create nid_verifications or nid_verification_logs tables. Please run migration_nid_verification.sql manually.');
  }
};

// Function to ensure bookings table constraints are up to date
const ensureBookingsConstraints = async () => {
  try {
    // Check if bookings table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return; // Table doesn't exist yet, skip
    }

    // 0. Make worker_id nullable if it's not already (needed for call_worker bookings)
    try {
      const workerIdCheck = await query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'worker_id'
      `);
      
      if (workerIdCheck.rows.length > 0 && workerIdCheck.rows[0].is_nullable === 'NO') {
        console.log('⚠ Making worker_id nullable for call_worker bookings...');
        await query(`ALTER TABLE bookings ALTER COLUMN worker_id DROP NOT NULL`);
        console.log('✓ Successfully made worker_id nullable');
      }
    } catch (error) {
      console.log('⚠ Could not update worker_id column (may already be nullable):', error.message);
    }

    // 1. Update booking_type constraint to include 'call_worker'
    const bookingTypeCheck = await query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'bookings_booking_type_check'
      AND constraint_schema = 'public'
    `);

    if (bookingTypeCheck.rows.length > 0) {
      const checkClause = bookingTypeCheck.rows[0].check_clause;
      if (!checkClause.includes("'call_worker'")) {
        console.log('⚠ Updating bookings booking_type constraint to include call_worker...');
        await query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check`);
        await query(`
          ALTER TABLE bookings 
          ADD CONSTRAINT bookings_booking_type_check 
          CHECK (booking_type IN ('instant', 'scheduled', 'call_worker'))
        `);
        console.log('✓ Successfully updated bookings booking_type constraint');
      }
    } else {
      // Constraint might not exist or have different name, try to add it
      console.log('⚠ Adding bookings booking_type constraint with call_worker...');
      await query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check`);
      await query(`
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_booking_type_check 
        CHECK (booking_type IN ('instant', 'scheduled', 'call_worker'))
      `);
      console.log('✓ Successfully added bookings booking_type constraint');
    }

    // 2. Update status constraint to include 'pending_estimation'
    // First, find all check constraints on the bookings table for the status column
    const statusConstraintsCheck = await query(`
      SELECT tc.constraint_name, cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
        AND tc.constraint_schema = cc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'bookings'
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%status%'
    `);

    let statusConstraintExists = false;
    let statusConstraintName = null;
    
    if (statusConstraintsCheck.rows.length > 0) {
      statusConstraintExists = true;
      statusConstraintName = statusConstraintsCheck.rows[0].constraint_name;
      const checkClause = statusConstraintsCheck.rows[0].check_clause;
      
      // Check if 'pending_estimation' is already in the constraint
      if (checkClause.includes("'pending_estimation'") || checkClause.includes('pending_estimation')) {
        console.log('✓ Bookings status constraint already includes pending_estimation');
      } else {
        console.log('⚠ Updating bookings status constraint to include pending_estimation...');
        // Drop the existing constraint (whatever its name is)
        await query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ${statusConstraintName}`);
        await query(`
          ALTER TABLE bookings 
          ADD CONSTRAINT bookings_status_check 
          CHECK (status IN ('pending', 'pending_estimation', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'))
        `);
        console.log('✓ Successfully updated bookings status constraint to include pending_estimation');
      }
    } else {
      // Try to drop any constraint that might exist with a different name pattern
      console.log('⚠ No status constraint found with standard name, checking for any status-related constraints...');
      
      // Drop any existing constraint and add new one
      await query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check`);
      await query(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_check`);
      
      // Add the new constraint
      console.log('⚠ Adding bookings status constraint with pending_estimation...');
      await query(`
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_status_check 
        CHECK (status IN ('pending', 'pending_estimation', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'))
      `);
      console.log('✓ Successfully added bookings status constraint');
    }
  } catch (error) {
    console.error('Error updating bookings constraints:', error);
    // Don't throw, just log - the server can still start
    console.log('⚠ Warning: Could not update bookings constraints. Please run migration manually.');
  }
};

// Function to ensure profile_photo column is TEXT type (supports long URLs/base64)
const ensureProfilePhotoColumn = async () => {
  try {
    // Check if users table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return; // Table doesn't exist yet, skip
    }

    // Check current data type of profile_photo column
    const columnCheck = await query(`
      SELECT data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'profile_photo'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠ profile_photo column not found in users table');
      return;
    }

    const currentType = columnCheck.rows[0].data_type;
    const maxLength = columnCheck.rows[0].character_maximum_length;

    // If it's VARCHAR with a limit (like VARCHAR(500)), change it to TEXT
    if (currentType === 'character varying' && maxLength !== null) {
      console.log(`⚠ Migrating profile_photo column from VARCHAR(${maxLength}) to TEXT...`);
      try {
        await query(`
          ALTER TABLE users 
          ALTER COLUMN profile_photo TYPE TEXT
        `);
        console.log('✓ Successfully migrated profile_photo column to TEXT');
      } catch (error) {
        console.error('Error migrating profile_photo column:', error);
        console.log('⚠ Warning: Could not migrate profile_photo column. Please run migration_profile_photo_text.sql manually.');
      }
    } else if (currentType === 'text') {
      console.log('✓ profile_photo column is already TEXT type');
    } else {
      console.log(`⚠ profile_photo column has unexpected type: ${currentType}. Consider migrating to TEXT.`);
    }
  } catch (error) {
    console.error('Error checking profile_photo column:', error);
    // Don't throw, just log - the server can still start
    console.log('⚠ Warning: Could not check profile_photo column. Please run migration_profile_photo_text.sql manually.');
  }
};

// Function to ensure blog_posts featured_image column is TEXT type (supports long URLs/base64)
const ensureBlogFeaturedImageColumn = async () => {
  try {
    // Check if blog_posts table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blog_posts'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return; // Table doesn't exist yet, skip
    }

    // Check current data type of featured_image column
    const columnCheck = await query(`
      SELECT data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'blog_posts'
        AND column_name = 'featured_image'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠ featured_image column not found in blog_posts table');
      return;
    }

    const currentType = columnCheck.rows[0].data_type;
    const maxLength = columnCheck.rows[0].character_maximum_length;

    // If it's VARCHAR with a limit (like VARCHAR(500)), change it to TEXT
    if (currentType === 'character varying' && maxLength !== null) {
      console.log(`⚠ Migrating blog_posts.featured_image column from VARCHAR(${maxLength}) to TEXT...`);
      try {
        await query(`
          ALTER TABLE blog_posts 
          ALTER COLUMN featured_image TYPE TEXT
        `);
        console.log('✓ Successfully migrated blog_posts.featured_image column to TEXT');
      } catch (error) {
        console.error('Error migrating blog_posts.featured_image column:', error);
        console.log('⚠ Warning: Could not migrate blog_posts.featured_image column. Please run migration manually.');
      }
    } else if (currentType === 'text') {
      console.log('✓ blog_posts.featured_image column is already TEXT type');
    } else {
      console.log(`⚠ blog_posts.featured_image column has unexpected type: ${currentType}. Consider migrating to TEXT.`);
    }
  } catch (error) {
    console.error('Error checking blog_posts.featured_image column:', error);
    console.log('⚠ Warning: Could not check blog_posts.featured_image column type. Continuing...');
  }
};

// Function to ensure products image_url column is TEXT type (supports long URLs/base64)
const ensureProductImageUrlColumn = async () => {
  try {
    // Check if products table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return; // Table doesn't exist yet, skip
    }

    // Check current data type of image_url column
    const columnCheck = await query(`
      SELECT data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'image_url'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('⚠ image_url column not found in products table');
      return;
    }

    const currentType = columnCheck.rows[0].data_type;
    const maxLength = columnCheck.rows[0].character_maximum_length;

    // If it's VARCHAR with a limit (like VARCHAR(500)), change it to TEXT
    if (currentType === 'character varying' && maxLength !== null) {
      console.log(`⚠ Migrating products.image_url column from VARCHAR(${maxLength}) to TEXT...`);
      try {
        await query(`
          ALTER TABLE products 
          ALTER COLUMN image_url TYPE TEXT
        `);
        console.log('✓ Successfully migrated products.image_url column to TEXT');
      } catch (error) {
        console.error('Error migrating products.image_url column:', error);
        console.log('⚠ Warning: Could not migrate products.image_url column. Please run migration manually.');
      }
    } else if (currentType === 'text') {
      console.log('✓ products.image_url column is already TEXT type');
    } else {
      console.log(`⚠ products.image_url column has unexpected type: ${currentType}. Consider migrating to TEXT.`);
    }
  } catch (error) {
    console.error('Error checking products.image_url column:', error);
    console.log('⚠ Warning: Could not check products.image_url column type. Continuing...');
  }
};

// Function to ensure loyalty_points_history table exists
const ensureLoyaltyPointsHistoryTable = async () => {
  try {
    // Check if loyalty_points_history table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'loyalty_points_history'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠ Creating loyalty_points_history table...');
      await query(`
        CREATE TABLE loyalty_points_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
          points_earned INTEGER DEFAULT 0,
          points_used INTEGER DEFAULT 0,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_loyalty_points_history_user_id ON loyalty_points_history(user_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_loyalty_points_history_booking_id ON loyalty_points_history(booking_id)`);
      console.log('✓ Successfully created loyalty_points_history table');
    } else {
      console.log('✓ loyalty_points_history table already exists');
    }
  } catch (error) {
    console.error('Error creating loyalty_points_history table:', error);
    console.log('⚠ Warning: Could not create loyalty_points_history table. Please run migration manually.');
  }
};

// Function to ensure bookings table has slot_id column
const ensureBookingsSlotIdColumn = async () => {
  try {
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return; // Table doesn't exist yet
    }

    const columnCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'slot_id'
      )
    `);

    if (!columnCheck.rows[0].exists) {
      console.log('⚠ Adding slot_id column to bookings table...');
      await query(`
        ALTER TABLE bookings 
        ADD COLUMN slot_id UUID REFERENCES worker_slots(id) ON DELETE SET NULL
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id)`);
      console.log('✓ Successfully added slot_id column to bookings table');
    } else {
      console.log('✓ bookings.slot_id column already exists');
    }
  } catch (error) {
    console.error('Error adding slot_id column to bookings:', error);
    console.log('⚠ Warning: Could not add slot_id column. Please run migration manually.');
  }
};

// Function to ensure worker_slots table exists
const ensureWorkerSlotsTable = async () => {
  try {
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'worker_slots'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠ Creating worker_slots table...');
      await query(`
        CREATE TABLE worker_slots (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          slot_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'busy', 'booked')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(worker_id, slot_date, start_time)
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_slots_worker_id ON worker_slots(worker_id)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_slots_date ON worker_slots(slot_date)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_slots_status ON worker_slots(status)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_worker_slots_worker_date_status ON worker_slots(worker_id, slot_date, status)`);
      console.log('✓ Successfully created worker_slots table');
    } else {
      console.log('✓ worker_slots table already exists');
    }
  } catch (error) {
    console.error('Error creating worker_slots table:', error);
    console.log('⚠ Warning: Could not create worker_slots table. Please run migration manually.');
  }
};

// Function to initialize database tables (for first-time setup)
const initializeTables = async () => {
  try {
    // Check if tables exist
    const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!result.rows[0].exists) {
      console.log('⚠ Database tables not found. Please run init.sql script first.');
      console.log('Instructions:');
      console.log('1. Open pgAdmin 4');
      console.log('2. Right-click on your database > Query Tool');
      console.log('3. Copy and paste the contents of database/init.sql');
      console.log('4. Execute the script (F5)');
      console.log('5. Then run database/seed.sql for initial data');
      return false;
    }

    console.log('✓ Database tables verified');
    
    // Ensure profile_photo column is TEXT type (supports long URLs/base64)
    await ensureProfilePhotoColumn();
    
    // Ensure blog_posts featured_image column is TEXT type (supports long URLs/base64)
    await ensureBlogFeaturedImageColumn();
    
    // Ensure products image_url column is TEXT type (supports long URLs/base64)
    await ensureProductImageUrlColumn();
    
    // Ensure loyalty_points_history table exists
    await ensureLoyaltyPointsHistoryTable();
    
    // Ensure NID verification tables exist
    await ensureNIDVerificationTables();
    
    // Ensure bookings constraints are up to date (booking_type and status)
    await ensureBookingsConstraints();
    
    // Ensure booking_images and worker_estimates tables exist (for instant call feature)
    await ensureInstantCallTables();
    
    // Ensure worker_slots table exists (for slot-based booking)
    await ensureWorkerSlotsTable();
    
    // Ensure bookings table has slot_id column
    await ensureBookingsSlotIdColumn();
    
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  initializeTables
};