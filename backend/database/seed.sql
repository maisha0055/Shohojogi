-- Seed Data for Worker Calling System
-- Execute this AFTER running init.sql

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

-- Insert Admin User
-- Password: Admin@12345 (hashed with bcrypt)
INSERT INTO users (email, password, full_name, phone, role, is_verified, is_active) VALUES
('admin@workercalling.com', '$2b$10$YourHashedPasswordHere', 'System Administrator', '+8801700000000', 'admin', TRUE, TRUE);

-- Insert Sample Regular Users
INSERT INTO users (email, password, full_name, phone, role, address, latitude, longitude, preferred_language) VALUES
('john.doe@example.com', '$2b$10$YourHashedPasswordHere', 'John Doe', '+8801711111111', 'user', 'Dhanmondi, Dhaka', 23.7461, 90.3742, 'en'),
('রহিম@example.com', '$2b$10$YourHashedPasswordHere', 'আব্দুর রহিম', '+8801722222222', 'user', 'মিরপুর, ঢাকা', 23.8223, 90.3654, 'bn'),
('sara.ahmed@example.com', '$2b$10$YourHashedPasswordHere', 'Sara Ahmed', '+8801733333333', 'user', 'Gulshan, Dhaka', 23.7808, 90.4126, 'en');

-- Insert Sample Workers
-- First, create user accounts for workers
INSERT INTO users (email, password, full_name, phone, role, address, latitude, longitude, is_verified) VALUES
('karim.carpenter@example.com', '$2b$10$YourHashedPasswordHere', 'Karim Hossain', '+8801744444444', 'worker', 'Mirpur 10, Dhaka', 23.8070, 90.3688, TRUE),
('electrician.rahim@example.com', '$2b$10$YourHashedPasswordHere', 'Rahim Uddin', '+8801755555555', 'worker', 'Dhanmondi 27, Dhaka', 23.7463, 90.3786, TRUE),
('plumber.hasan@example.com', '$2b$10$YourHashedPasswordHere', 'Hasan Ali', '+8801766666666', 'worker', 'Banani, Dhaka', 23.7937, 90.4066, TRUE),
('mechanic.aslam@example.com', '$2b$10$YourHashedPasswordHere', 'Aslam Sheikh', '+8801777777777', 'worker', 'Mohammadpur, Dhaka', 23.7678, 90.3595, TRUE),
('painter.jobayer@example.com', '$2b$10$YourHashedPasswordHere', 'Jobayer Islam', '+8801788888888', 'worker', 'Uttara, Dhaka', 23.8759, 90.3795, TRUE);

-- Create Worker Profiles (linking to service categories)
-- Note: You'll need to get the actual UUIDs from the users and service_categories tables
-- This is a template - in actual implementation, we'll use backend code to insert with proper UUIDs

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

-- Insert sample loyalty points for users
-- This will be done programmatically when bookings are completed

-- How to Execute Seed Data:
-- 1. Make sure init.sql has been executed first
-- 2. Open pgAdmin 4 Query Tool
-- 3. Copy and paste this script
-- 4. Execute (F5)
-- 5. Verify data by running: SELECT * FROM service_categories;
--
-- Note: The password hashes shown here are placeholders
-- In actual implementation, passwords will be hashed by the backend during user creation
-- For testing, you can use the auth/register endpoint to create real users