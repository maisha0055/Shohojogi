-- seed.sql - UPDATED VERSION
-- Execute this AFTER running init.sql
-- IMPORTANT: First run generateHash.js to get real password hashes, then replace them below

-- ============================================================================
-- STEP 1: Generate password hashes first!
-- Run: node generateHash.js
-- Then replace the hashes below with the generated ones
-- ============================================================================

-- Clear existing data (optional - use if re-seeding)
-- TRUNCATE TABLE blog_posts, loyalty_points_history, favorites, notifications, messages, reviews, bookings, worker_profiles, service_categories, users CASCADE;

-- Insert Service Categories
INSERT INTO service_categories (name_en, name_bn, description_en, description_bn, icon_url) VALUES
('Carpenter', 'কাঠমিস্ত্রি', 'Furniture repair, wood work, door and window fixing', 'আসবাবপত্র মেরামত, কাঠের কাজ, দরজা এবং জানালা ঠিক করা', 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png'),
('Electrician', 'ইলেকট্রিশিয়ান', 'Electrical wiring, fixture installation, repair work', 'বৈদ্যুতিক তারের কাজ, ফিক্সচার ইনস্টলেশন, মেরামতের কাজ', 'https://cdn-icons-png.flaticon.com/512/2936/2936756.png'),
('Plumber', 'প্লাম্বার', 'Pipe fixing, drainage system, water supply issues', 'পাইপ ঠিক করা, নিকাশী ব্যবস্থা, পানি সরবরাহ সমস্যা', 'https://cdn-icons-png.flaticon.com/512/2936/2936730.png'),
('Mechanic', 'মেকানিক', 'Vehicle repair, bike and car servicing', 'যানবাহন মেরামত, বাইক এবং গাড়ি সার্ভিসিং', 'https://cdn-icons-png.flaticon.com/512/2936/2936675.png'),
('Painter', 'চিত্রশিল্পী', 'House painting, wall decoration, color consultation', 'ঘর রঙ করা, দেয়াল সাজসজ্জা, রঙের পরামর্শ', 'https://cdn-icons-png.flaticon.com/512/2936/2936682.png'),
('AC Technician', 'এসি টেকনিশিয়ান', 'Air conditioner installation, repair, and maintenance', 'এয়ার কন্ডিশনার ইনস্টলেশন, মেরামত এবং রক্ষণাবেক্ষণ', 'https://cdn-icons-png.flaticon.com/512/2936/2936876.png'),
('Cleaning Service', 'পরিষ্কার সেবা', 'Home cleaning, office cleaning, deep cleaning', 'বাড়ি পরিষ্কার, অফিস পরিষ্কার, গভীর পরিষ্কার', 'https://cdn-icons-png.flaticon.com/512/2936/2936749.png'),
('Key Maker', 'চাবি প্রস্তুতকারক', 'Key duplication, lock repair, emergency lockout service', 'চাবি নকল, তালা মেরামত, জরুরী লকআউট সেবা', 'https://cdn-icons-png.flaticon.com/512/2936/2936798.png'),
('Gardener', 'মালী', 'Garden maintenance, lawn care, plant care', 'বাগান রক্ষণাবেক্ষণ, লন যত্ন, উদ্ভিদ যত্ন', 'https://cdn-icons-png.flaticon.com/512/2936/2936820.png'),
('Mason', 'রাজমিস্ত্রি', 'Brick work, wall construction, tiling work', 'ইটের কাজ, দেয়াল নির্মাণ, টাইল করার কাজ', 'https://cdn-icons-png.flaticon.com/512/2936/2936864.png'),
('Welder', 'ওয়েল্ডার', 'Metal welding, gate repair, grill work', 'ধাতব ওয়েল্ডিং, গেট মেরামত, গ্রিলের কাজ', 'https://cdn-icons-png.flaticon.com/512/2936/2936722.png'),
('CCTV Technician', 'সিসিটিভি টেকনিশিয়ান', 'CCTV installation, security camera setup', 'সিসিটিভি ইনস্টলেশন, নিরাপত্তা ক্যামেরা সেটআপ', 'https://cdn-icons-png.flaticon.com/512/2936/2936808.png'),
('Pest Control', 'কীটপতঙ্গ নিয়ন্ত্রণ', 'Pest removal, fumigation, mosquito control', 'কীটপতঙ্গ অপসারণ, ধূমপান, মশা নিয়ন্ত্রণ', 'https://cdn-icons-png.flaticon.com/512/2936/2936844.png'),
('Appliance Repair', 'যন্ত্রপাতি মেরামত', 'Refrigerator, washing machine, oven repair', 'রেফ্রিজারেটর, ওয়াশিং মেশিন, ওভেন মেরামত', 'https://cdn-icons-png.flaticon.com/512/2936/2936790.png'),
('Tailor', 'দরজি', 'Clothes stitching, alteration, custom tailoring', 'পোশাক সেলাই, পরিবর্তন, কাস্টম টেইলারিং', 'https://cdn-icons-png.flaticon.com/512/2936/2936714.png');

-- ============================================================================
-- Insert Admin User
-- Password: Admin@12345
-- REPLACE THIS HASH with the one generated from generateHash.js
-- ============================================================================
INSERT INTO users (email, password, full_name, phone, role, is_verified, is_active) VALUES
('admin@workercalling.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'System Administrator', '+8801700000000', 'admin', TRUE, TRUE);

-- ============================================================================
-- Insert Sample Regular Users
-- Password: Test123456
-- REPLACE THESE HASHES with the ones generated from generateHash.js
-- ============================================================================
INSERT INTO users (email, password, full_name, phone, role, address, latitude, longitude, preferred_language) VALUES
('john.doe@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'John Doe', '+8801711111111', 'user', 'Dhanmondi, Dhaka', 23.7461, 90.3742, 'en'),
('rahim@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'আব্দুর রহিম', '+8801722222222', 'user', 'মিরপুর, ঢাকা', 23.8223, 90.3654, 'bn'),
('sara.ahmed@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Sara Ahmed', '+8801733333333', 'user', 'Gulshan, Dhaka', 23.7808, 90.4126, 'en');

-- ============================================================================
-- Insert Sample Workers
-- Password: Worker123
-- REPLACE THESE HASHES with the ones generated from generateHash.js
-- ============================================================================
INSERT INTO users (email, password, full_name, phone, role, address, latitude, longitude, is_verified) VALUES
('karim.carpenter@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Karim Hossain', '+8801744444444', 'worker', 'Mirpur 10, Dhaka', 23.8070, 90.3688, TRUE),
('electrician.rahim@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Rahim Uddin', '+8801755555555', 'worker', 'Dhanmondi 27, Dhaka', 23.7463, 90.3786, TRUE),
('plumber.hasan@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Hasan Ali', '+8801766666666', 'worker', 'Banani, Dhaka', 23.7937, 90.4066, TRUE),
('mechanic.aslam@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Aslam Sheikh', '+8801777777777', 'worker', 'Mohammadpur, Dhaka', 23.7678, 90.3595, TRUE),
('painter.jobayer@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Jobayer Islam', '+8801788888888', 'worker', 'Uttara, Dhaka', 23.8759, 90.3795, TRUE),
('ac.technician@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Farhan Ahmed', '+8801799999999', 'worker', 'Bashundhara, Dhaka', 23.8223, 90.4254, TRUE),
('cleaner.nasim@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Nasim Miah', '+8801711122222', 'worker', 'Khilgaon, Dhaka', 23.7521, 90.4282, TRUE),
('keymaker.alam@example.com', '$2b$10$REPLACE_WITH_GENERATED_HASH', 'Alam Sheikh', '+8801722233333', 'worker', 'Shyamoli, Dhaka', 23.7679, 90.3682, TRUE);

-- ============================================================================
-- Create Worker Profiles with proper service categories
-- This links workers to their categories and sets them as VERIFIED
-- ============================================================================
INSERT INTO worker_profiles (
    user_id, 
    service_category_id, 
    experience_years, 
    hourly_rate, 
    bio, 
    skills, 
    availability_status, 
    verification_status,
    average_rating,
    total_reviews,
    total_jobs_completed,
    is_featured
)
SELECT 
    u.id,
    sc.id,
    CASE 
        WHEN u.email = 'karim.carpenter@example.com' THEN 8
        WHEN u.email = 'electrician.rahim@example.com' THEN 10
        WHEN u.email = 'plumber.hasan@example.com' THEN 6
        WHEN u.email = 'mechanic.aslam@example.com' THEN 12
        WHEN u.email = 'painter.jobayer@example.com' THEN 7
        WHEN u.email = 'ac.technician@example.com' THEN 5
        WHEN u.email = 'cleaner.nasim@example.com' THEN 4
        WHEN u.email = 'keymaker.alam@example.com' THEN 9
    END as experience_years,
    CASE 
        WHEN u.email = 'karim.carpenter@example.com' THEN 500
        WHEN u.email = 'electrician.rahim@example.com' THEN 600
        WHEN u.email = 'plumber.hasan@example.com' THEN 450
        WHEN u.email = 'mechanic.aslam@example.com' THEN 700
        WHEN u.email = 'painter.jobayer@example.com' THEN 400
        WHEN u.email = 'ac.technician@example.com' THEN 650
        WHEN u.email = 'cleaner.nasim@example.com' THEN 350
        WHEN u.email = 'keymaker.alam@example.com' THEN 300
    END as hourly_rate,
    CASE 
        WHEN u.email = 'karim.carpenter@example.com' THEN 'Expert carpenter with 8 years of experience in furniture making, repair, and custom woodwork. Available for all types of carpentry jobs.'
        WHEN u.email = 'electrician.rahim@example.com' THEN 'Licensed electrician specializing in residential and commercial electrical work. Available 24/7 for emergency repairs.'
        WHEN u.email = 'plumber.hasan@example.com' THEN 'Professional plumber with expertise in pipe installation, drainage systems, and water heater repairs. Fast and reliable service.'
        WHEN u.email = 'mechanic.aslam@example.com' THEN 'Experienced auto mechanic specializing in both bikes and cars. Expert in engine repair, servicing, and diagnostics.'
        WHEN u.email = 'painter.jobayer@example.com' THEN 'Professional painter with 7 years of experience. Specializing in interior and exterior painting, wall textures, and color consulting.'
        WHEN u.email = 'ac.technician@example.com' THEN 'Certified AC technician for installation, repair, and maintenance of all brands. Quick service guaranteed.'
        WHEN u.email = 'cleaner.nasim@example.com' THEN 'Professional cleaning service for homes and offices. Deep cleaning, regular maintenance, and move-in/out cleaning.'
        WHEN u.email = 'keymaker.alam@example.com' THEN 'Expert key maker and locksmith. Emergency lockout service, key duplication, and lock installation/repair.'
    END as bio,
    CASE 
        WHEN u.email = 'karim.carpenter@example.com' THEN ARRAY['Furniture repair', 'Door installation', 'Cabinet making', 'Wood polishing']
        WHEN u.email = 'electrician.rahim@example.com' THEN ARRAY['Wiring', 'Circuit breaker', 'Lighting installation', 'Panel repair']
        WHEN u.email = 'plumber.hasan@example.com' THEN ARRAY['Pipe repair', 'Bathroom fixtures', 'Water pump', 'Drainage cleaning']
        WHEN u.email = 'mechanic.aslam@example.com' THEN ARRAY['Engine repair', 'Oil change', 'Brake service', 'AC repair']
        WHEN u.email = 'painter.jobayer@example.com' THEN ARRAY['Interior painting', 'Exterior painting', 'Wall texture', 'Enamel work']
        WHEN u.email = 'ac.technician@example.com' THEN ARRAY['AC installation', 'Gas refill', 'Compressor repair', 'Maintenance']
        WHEN u.email = 'cleaner.nasim@example.com' THEN ARRAY['Deep cleaning', 'Regular cleaning', 'Office cleaning', 'Bathroom cleaning']
        WHEN u.email = 'keymaker.alam@example.com' THEN ARRAY['Key cutting', 'Lock repair', 'Emergency lockout', 'Security locks']
    END as skills,
    'available' as availability_status,
    'verified' as verification_status,
    CASE 
        WHEN u.email IN ('karim.carpenter@example.com', 'electrician.rahim@example.com') THEN 4.8
        WHEN u.email IN ('plumber.hasan@example.com', 'mechanic.aslam@example.com') THEN 4.6
        ELSE 4.5
    END as average_rating,
    CASE 
        WHEN u.email IN ('karim.carpenter@example.com', 'electrician.rahim@example.com') THEN 45
        WHEN u.email IN ('plumber.hasan@example.com', 'mechanic.aslam@example.com') THEN 38
        ELSE 25
    END as total_reviews,
    CASE 
        WHEN u.email IN ('karim.carpenter@example.com', 'electrician.rahim@example.com') THEN 120
        WHEN u.email IN ('plumber.hasan@example.com', 'mechanic.aslam@example.com') THEN 95
        ELSE 60
    END as total_jobs_completed,
    CASE 
        WHEN u.email IN ('karim.carpenter@example.com', 'electrician.rahim@example.com') THEN TRUE
        ELSE FALSE
    END as is_featured
FROM users u
CROSS JOIN service_categories sc
WHERE u.role = 'worker'
AND (
    (u.email = 'karim.carpenter@example.com' AND sc.name_en = 'Carpenter') OR
    (u.email = 'electrician.rahim@example.com' AND sc.name_en = 'Electrician') OR
    (u.email = 'plumber.hasan@example.com' AND sc.name_en = 'Plumber') OR
    (u.email = 'mechanic.aslam@example.com' AND sc.name_en = 'Mechanic') OR
    (u.email = 'painter.jobayer@example.com' AND sc.name_en = 'Painter') OR
    (u.email = 'ac.technician@example.com' AND sc.name_en = 'AC Technician') OR
    (u.email = 'cleaner.nasim@example.com' AND sc.name_en = 'Cleaning Service') OR
    (u.email = 'keymaker.alam@example.com' AND sc.name_en = 'Key Maker')
);

-- Sample Blog Posts
INSERT INTO blog_posts (title_en, title_bn, content_en, content_bn, category) VALUES
(
    'Top 10 Home Maintenance Tips',
    'শীর্ষ ১০ বাড়ি রক্ষণাবেক্ষণ টিপস',
    'Regular home maintenance is essential to keep your property in good condition. Here are our top 10 tips: 1. Check your roof regularly, 2. Clean gutters seasonally, 3. Service your HVAC system, 4. Inspect plumbing for leaks...',
    'নিয়মিত বাড়ি রক্ষণাবেক্ষণ আপনার সম্পত্তি ভাল অবস্থায় রাখতে অপরিহার্য। এখানে আমাদের শীর্ষ ১০ টিপস রয়েছে...',
    'Home Maintenance'
),
(
    'How to Choose the Right Worker',
    'সঠিক কর্মী কীভাবে নির্বাচন করবেন',
    'Choosing the right worker for your job is crucial. Look for verified profiles, check ratings and reviews, compare prices, and always communicate clearly about your requirements...',
    'আপনার কাজের জন্য সঠিক কর্মী নির্বাচন করা অত্যন্ত গুরুত্বপূর্ণ। যাচাইকৃত প্রোফাইল খুঁজুন, রেটিং এবং পর্যালোচনা পরীক্ষা করুন...',
    'Tips & Guides'
),
(
    'Safety Tips for Hiring Home Service Workers',
    'বাড়ির সেবা কর্মী নিয়োগের জন্য নিরাপত্তা টিপস',
    'Your safety is paramount. Always verify worker identity, check reviews, meet in public places if possible, and use the in-app chat for communication...',
    'আপনার নিরাপত্তা সর্বোপরি। সর্বদা কর্মীর পরিচয় যাচাই করুন, পর্যালোচনা পরীক্ষা করুন...',
    'Safety'
);

-- ============================================================================
-- VERIFICATION QUERY
-- Run this to verify all workers were created with their categories
-- ============================================================================
SELECT 
    u.full_name, 
    u.email, 
    sc.name_en as category,
    wp.verification_status,
    wp.availability_status,
    wp.hourly_rate,
    wp.experience_years,
    wp.average_rating,
    wp.total_jobs_completed
FROM users u
INNER JOIN worker_profiles wp ON u.id = wp.user_id
LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
WHERE u.role = 'worker'
ORDER BY u.full_name;

-- ============================================================================
-- EXECUTION INSTRUCTIONS:
-- ============================================================================
-- 1. First, install bcrypt in your backend: npm install bcrypt
-- 2. Create generateHash.js file in your backend root (see artifact)
-- 3. Run: node generateHash.js
-- 4. Copy the generated hashes and replace all '$2b$10$REPLACE_WITH_GENERATED_HASH' in this file
-- 5. Open pgAdmin 4
-- 6. Right-click on your database > Query Tool
-- 7. Paste this ENTIRE UPDATED script
-- 8. Execute (F5)
-- 9. Check the results from the verification query at the bottom
-- 10. Test login with:
--     - Admin: admin@workercalling.com / Admin@12345
--     - User: john.doe@example.com / Test123456
--     - Worker: karim.carpenter@example.com / Worker123
-- ============================================================================