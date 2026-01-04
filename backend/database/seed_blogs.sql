-- Blog Posts Seed Data
-- Insert all blog posts with beautiful images and relevant content

-- First, get admin user ID (assuming admin exists)
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin exists, we'll use NULL for author_id
    IF admin_user_id IS NULL THEN
        admin_user_id := NULL;
    END IF;

    -- Insert all blog posts
    INSERT INTO blog_posts (title_en, title_bn, content_en, content_bn, author_id, category, featured_image, is_published, views) VALUES
    
    -- 1. How WorkerCall Makes Hiring Service Workers Easy
    (
        'How WorkerCall Makes Hiring Service Workers Easy',
        'WorkerCall কীভাবে সেবা কর্মী নিয়োগ সহজ করে',
        'Finding reliable service workers can be challenging, but WorkerCall simplifies the entire process. Our platform connects you with verified, skilled professionals in your area. With features like instant booking, real-time tracking, and secure payments, hiring a service worker has never been easier. Browse through profiles, read reviews, compare prices, and book your service worker with just a few clicks. WorkerCall ensures quality service and peace of mind for every home maintenance need.',
        'নির্ভরযোগ্য সেবা কর্মী খুঁজে পাওয়া চ্যালেঞ্জিং হতে পারে, কিন্তু WorkerCall পুরো প্রক্রিয়াটি সহজ করে তোলে। আমাদের প্ল্যাটফর্ম আপনাকে আপনার এলাকায় যাচাইকৃত, দক্ষ পেশাদারদের সাথে সংযুক্ত করে। ইনস্ট্যান্ট বুকিং, রিয়েল-টাইম ট্র্যাকিং এবং নিরাপদ পেমেন্টের মতো বৈশিষ্ট্যগুলির সাথে, সেবা কর্মী নিয়োগ আগের চেয়ে সহজ হয়ে উঠেছে। প্রোফাইল ব্রাউজ করুন, পর্যালোচনা পড়ুন, মূল্য তুলনা করুন এবং কয়েকটি ক্লিকেই আপনার সেবা কর্মী বুক করুন।',
        admin_user_id,
        'Platform Guide',
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 2. 10 Common Plumbing Problems and How to Fix Them
    (
        '10 Common Plumbing Problems and How to Fix Them',
        '১০টি সাধারণ প্লাম্বিং সমস্যা এবং কীভাবে সেগুলি ঠিক করবেন',
        'Plumbing issues are among the most common household problems. From leaky faucets to clogged drains, here are 10 frequent plumbing problems and their solutions: 1) Dripping faucets - usually caused by worn washers, 2) Slow drains - often due to hair and soap buildup, 3) Running toilets - check the flapper valve, 4) Low water pressure - may indicate pipe corrosion, 5) Leaky pipes - inspect joints and connections, 6) Water heater problems - check thermostat and heating elements, 7) Clogged garbage disposal - avoid putting grease and fibrous foods, 8) Sewer system backup - requires professional attention, 9) Frozen pipes - insulate pipes in cold weather, 10) Noisy pipes - may indicate water hammer or loose connections. While some issues can be DIY fixes, always call a professional plumber for complex problems.',
        'প্লাম্বিং সমস্যাগুলি সবচেয়ে সাধারণ গৃহস্থালি সমস্যাগুলির মধ্যে একটি। ফুটো কল থেকে শুরু করে বন্ধ ড্রেন পর্যন্ত, এখানে ১০টি ঘন ঘন হওয়া প্লাম্বিং সমস্যা এবং তাদের সমাধান রয়েছে...',
        admin_user_id,
        'Home Maintenance',
        'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 3. Electrical Safety Tips for Every Home
    (
        'Electrical Safety Tips for Every Home',
        'প্রতিটি বাড়ির জন্য বৈদ্যুতিক নিরাপত্তা টিপস',
        'Electrical safety is crucial for protecting your family and property. Follow these essential tips: Always turn off power at the circuit breaker before working on electrical systems. Use GFCI outlets in bathrooms and kitchens. Never overload circuits or extension cords. Replace damaged cords immediately. Keep electrical devices away from water. Install smoke detectors and test them monthly. Use proper wattage bulbs in fixtures. Never use electrical appliances with wet hands. Hire licensed electricians for all major electrical work. Regular inspections can prevent dangerous situations. Remember, electricity is powerful and can be deadly - when in doubt, call a professional electrician.',
        'আপনার পরিবার এবং সম্পত্তি রক্ষার জন্য বৈদ্যুতিক নিরাপত্তা অত্যন্ত গুরুত্বপূর্ণ। এই প্রয়োজনীয় টিপসগুলি অনুসরণ করুন...',
        admin_user_id,
        'Safety',
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 4. How Loyalty Points Help You Save Money
    (
        'How Loyalty Points Help You Save Money',
        'লয়্যালটি পয়েন্ট কীভাবে আপনার অর্থ সাশ্রয় করতে সাহায্য করে',
        'WorkerCall''s loyalty program rewards you for every booking you complete. Earn 1 point for every 100 BDT spent on completed and paid bookings. Start with 20 welcome bonus points when you register. As you accumulate points, you automatically advance through tiers: Bronze (0-49 points), Silver (50-149 points), and Gold (150+ points). Redeem your points during checkout - 10 points equals 50 BDT discount, with a maximum discount of 20% per booking. The more you use WorkerCall, the more you save. Loyalty points make home maintenance more affordable while rewarding your continued trust in our platform.',
        'WorkerCall-এর লয়্যালটি প্রোগ্রাম আপনাকে প্রতিটি সম্পন্ন বুকিংয়ের জন্য পুরস্কৃত করে। সম্পন্ন এবং প্রদত্ত বুকিংয়ে প্রতি ১০০ টাকা খরচে ১ পয়েন্ট অর্জন করুন...',
        admin_user_id,
        'Tips & Guides',
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 5. How to Choose the Right Service Worker
    (
        'How to Choose the Right Service Worker',
        'সঠিক সেবা কর্মী কীভাবে নির্বাচন করবেন',
        'Selecting the right service worker is essential for quality results. Start by checking their profile verification status - verified workers have completed identity checks. Read customer reviews and ratings to understand their work quality and reliability. Compare prices from multiple workers to ensure fair pricing. Check their experience level and completed jobs count. Look at their service area to ensure they can reach your location. Review their response time and availability. Ask questions about their approach to your specific job. Verify they have the necessary tools and skills. Consider their communication style and professionalism. Finally, trust your instincts - if something feels off, look for another worker. WorkerCall makes this process easy with comprehensive profiles and transparent information.',
        'সঠিক সেবা কর্মী নির্বাচন করা মানসম্মত ফলাফলের জন্য অপরিহার্য। তাদের প্রোফাইল যাচাইকরণ অবস্থা পরীক্ষা করে শুরু করুন...',
        admin_user_id,
        'Tips & Guides',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 6. Monsoon Season Home Maintenance Tips
    (
        'Monsoon Season Home Maintenance Tips',
        'মৌসুমী বৃষ্টির মৌসুমে বাড়ি রক্ষণাবেক্ষণের টিপস',
        'Monsoon season brings heavy rains that can cause significant damage to your home. Prepare your property with these essential maintenance tips: Inspect and clean gutters and downspouts to prevent water accumulation. Check your roof for leaks and damaged shingles. Seal windows and doors to prevent water seepage. Ensure proper drainage around your property. Trim trees and branches near your home. Check electrical systems for water damage. Inspect plumbing for leaks and blockages. Waterproof basements and lower floors. Test sump pumps if you have them. Keep emergency contact numbers handy. Stock up on essential supplies. Regular maintenance before monsoon can save you from costly repairs later.',
        'মৌসুমী বৃষ্টির মৌসুমে ভারী বৃষ্টি আপনার বাড়িতে উল্লেখযোগ্য ক্ষতি করতে পারে। এই প্রয়োজনীয় রক্ষণাবেক্ষণের টিপস দিয়ে আপনার সম্পত্তি প্রস্তুত করুন...',
        admin_user_id,
        'Home Maintenance',
        'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 7. When Should You Call an Electrician Instead of DIY
    (
        'When Should You Call an Electrician Instead of DIY',
        'কখন DIY-এর পরিবর্তে একজন ইলেকট্রিশিয়ানকে কল করবেন',
        'While some electrical tasks are safe for DIY, many require professional expertise. Call a licensed electrician for: Circuit breaker trips that keep happening, flickering or dimming lights, burning smells from outlets or switches, sparking outlets, outdated electrical panels, installing new circuits or outlets, upgrading electrical service, GFCI outlet installation, whole-house surge protection, and any work involving the main electrical panel. Electrical work can be dangerous and may violate building codes if done incorrectly. Licensed electricians have the training, tools, and knowledge to ensure safe, code-compliant work. Don''t risk your safety or your home - hire a professional electrician for complex electrical tasks.',
        'যদিও কিছু বৈদ্যুতিক কাজ DIY-এর জন্য নিরাপদ, অনেকের জন্য পেশাদার দক্ষতার প্রয়োজন। একজন লাইসেন্সপ্রাপ্ত ইলেকট্রিশিয়ানকে কল করুন...',
        admin_user_id,
        'Safety',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 8. Simple Home Maintenance Tips Every Homeowner Should Know
    (
        'Simple Home Maintenance Tips Every Homeowner Should Know',
        'প্রতিটি গৃহকর্তার জানা উচিত সহজ বাড়ি রক্ষণাবেক্ষণের টিপস',
        'Regular home maintenance prevents costly repairs and keeps your home in excellent condition. Here are essential tips every homeowner should know: Change HVAC filters every 3 months. Test smoke and carbon monoxide detectors monthly. Clean gutters twice a year. Inspect roof annually for damage. Check for water leaks regularly. Maintain your water heater by flushing it annually. Clean dryer vents to prevent fire hazards. Seal gaps around windows and doors. Keep trees trimmed away from your home. Test garage door safety features. Inspect foundation for cracks. Maintain proper humidity levels. These simple tasks, done regularly, can save thousands in repair costs and keep your home safe and comfortable.',
        'নিয়মিত বাড়ি রক্ষণাবেক্ষণ ব্যয়বহুল মেরামত প্রতিরোধ করে এবং আপনার বাড়িকে চমৎকার অবস্থায় রাখে। এখানে প্রতিটি গৃহকর্তার জানা উচিত প্রয়োজনীয় টিপস রয়েছে...',
        admin_user_id,
        'Home Maintenance',
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 9. Why Verified Workers Are Better Than Random Local Help
    (
        'Why Verified Workers Are Better Than Random Local Help',
        'কেন যাচাইকৃত কর্মীরা র্যান্ডম স্থানীয় সাহায্যের চেয়ে ভাল',
        'Hiring verified workers through WorkerCall offers numerous advantages over random local help. Verified workers have completed identity verification, ensuring you know who is entering your home. They have background checks and professional profiles. You can read real customer reviews and ratings. Pricing is transparent and competitive. Workers are insured and bonded for your protection. You have recourse if something goes wrong. Professional workers have proper tools and training. They follow safety protocols and building codes. WorkerCall provides customer support and dispute resolution. You can track your booking in real-time. Verified workers value their reputation and provide quality service. Don''t take risks with unverified help - choose verified professionals for peace of mind.',
        'WorkerCall-এর মাধ্যমে যাচাইকৃত কর্মী নিয়োগ র্যান্ডম স্থানীয় সাহায্যের চেয়ে অনেক সুবিধা প্রদান করে। যাচাইকৃত কর্মীরা পরিচয় যাচাইকরণ সম্পন্ন করেছেন...',
        admin_user_id,
        'Platform Guide',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 10. How Good Reviews Help Service Workers Get More Jobs
    (
        'How Good Reviews Help Service Workers Get More Jobs',
        'কীভাবে ভাল পর্যালোচনা সেবা কর্মীদের আরও কাজ পেতে সাহায্য করে',
        'Customer reviews are crucial for service workers building their reputation on WorkerCall. Good reviews increase visibility in search results, helping workers appear higher when customers browse. Positive feedback builds trust and credibility. Workers with high ratings get more booking requests. Reviews highlight specific skills and strengths. They help workers stand out from competitors. Good reviews lead to repeat customers and referrals. Workers can learn from feedback to improve their service. The review system creates accountability and quality standards. When you leave a detailed, honest review, you help workers grow their business while helping other customers make informed decisions. Take a moment after your service to leave a review - it makes a real difference.',
        'WorkerCall-এ তাদের খ্যাতি গড়ে তোলার জন্য সেবা কর্মীদের জন্য গ্রাহক পর্যালোচনা অত্যন্ত গুরুত্বপূর্ণ। ভাল পর্যালোচনা সার্চ ফলাফলে দৃশ্যমানতা বাড়ায়...',
        admin_user_id,
        'Tips & Guides',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 11. Ways to Save Money on Home Repairs
    (
        'Ways to Save Money on Home Repairs',
        'বাড়ি মেরামতে অর্থ সাশ্রয়ের উপায়',
        'Home repairs can be expensive, but smart strategies can help you save money. Compare quotes from multiple service workers to find the best price. Use WorkerCall''s loyalty points to get discounts on bookings. Schedule preventive maintenance to avoid costly emergency repairs. Learn basic DIY skills for simple tasks. Buy quality materials that last longer. Time your repairs during off-peak seasons when prices may be lower. Bundle multiple repairs together for better rates. Maintain your home regularly to prevent major issues. Research and understand the work needed before hiring. Ask about warranties and guarantees. Consider refurbished or gently used parts when appropriate. Build relationships with reliable workers for better pricing. With WorkerCall, you can save significantly while maintaining quality service.',
        'বাড়ি মেরামত ব্যয়বহুল হতে পারে, কিন্তু স্মার্ট কৌশল আপনাকে অর্থ সাশ্রয় করতে সাহায্য করতে পারে। সেরা মূল্য খুঁজে পেতে একাধিক সেবা কর্মীর কোট তুলনা করুন...',
        admin_user_id,
        'Tips & Guides',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 12. Emergency Home Repair Checklist for Every Family
    (
        'Emergency Home Repair Checklist for Every Family',
        'প্রতিটি পরিবারের জন্য জরুরি বাড়ি মেরামত চেকলিস্ট',
        'Be prepared for home emergencies with this essential checklist. Keep emergency contact numbers handy, including plumbers, electricians, and general contractors. Know the location of your main water shut-off valve and electrical panel. Have basic tools available: wrench, pliers, screwdrivers, flashlight, and duct tape. Keep a first aid kit accessible. Know how to turn off gas supply if needed. Have fire extinguishers in key locations. Keep emergency supplies like bottled water and non-perishable food. Document your home''s systems and their locations. Save WorkerCall app on your phone for quick access to verified workers. Test smoke and carbon monoxide detectors regularly. Have a backup power source if possible. Create an emergency plan with your family. Being prepared can minimize damage and stress during home emergencies.',
        'এই প্রয়োজনীয় চেকলিস্ট দিয়ে বাড়ির জরুরি অবস্থার জন্য প্রস্তুত থাকুন। প্লাম্বার, ইলেকট্রিশিয়ান এবং সাধারণ ঠিকাদার সহ জরুরি যোগাযোগের নম্বর হাতের কাছে রাখুন...',
        admin_user_id,
        'Safety',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 13. Gas Line Safety: What You Should Never Ignore
    (
        'Gas Line Safety: What You Should Never Ignore',
        'গ্যাস লাইন নিরাপত্তা: যা আপনি কখনই উপেক্ষা করবেন না',
        'Gas line safety is critical for your family''s protection. Never ignore these warning signs: The smell of rotten eggs (gas leak indicator), hissing sounds near gas lines, dead or dying vegetation near gas lines, bubbles in standing water, higher than normal gas bills, physical symptoms like dizziness or nausea. If you suspect a gas leak, immediately evacuate the area, don''t use electrical switches or phones, don''t light matches or create sparks, call emergency services from a safe distance, and contact a licensed gas technician. Never attempt DIY repairs on gas lines - always hire a certified professional. Regular inspections by qualified technicians can prevent dangerous situations. Gas safety is not something to take lightly - when in doubt, call a professional immediately.',
        'আপনার পরিবারের সুরক্ষার জন্য গ্যাস লাইন নিরাপত্তা অত্যন্ত গুরুত্বপূর্ণ। এই সতর্কতা লক্ষণগুলি কখনই উপেক্ষা করবেন না...',
        admin_user_id,
        'Safety',
        'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 14. Preparing Your Home for Summer
    (
        'Preparing Your Home for Summer',
        'গ্রীষ্মের জন্য আপনার বাড়ি প্রস্তুত করা',
        'Summer brings heat, humidity, and increased energy usage. Prepare your home with these essential tips: Service your air conditioning system before the heat arrives. Clean or replace HVAC filters for better efficiency. Check and seal windows and doors to keep cool air in. Inspect and clean ceiling fans. Test and maintain your pool equipment if you have one. Trim trees and shrubs to improve airflow. Check insulation in attics and walls. Inspect and clean gutters. Test smoke detectors and fire safety equipment. Prepare outdoor spaces for summer activities. Check outdoor electrical outlets and lighting. Service your water heater. Clean and organize storage areas. These preparations will help you stay comfortable and save on energy costs during the hot summer months.',
        'গ্রীষ্ম তাপ, আর্দ্রতা এবং বর্ধিত শক্তি ব্যবহার নিয়ে আসে। এই প্রয়োজনীয় টিপস দিয়ে আপনার বাড়ি প্রস্তুত করুন...',
        admin_user_id,
        'Home Maintenance',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        true,
        0
    ),
    
    -- 15. Cash vs Online Payment: Which Is Better for Home Services
    (
        'Cash vs Online Payment: Which Is Better for Home Services',
        'নগদ বনাম অনলাইন পেমেন্ট: বাড়ির সেবার জন্য কোনটি ভাল',
        'WorkerCall offers both cash and online payment options, each with distinct advantages. Online payments provide transaction records for your protection, eliminate the need to carry cash, offer secure encryption and fraud protection, enable easy expense tracking, allow payment from anywhere, provide instant confirmation, support loyalty point earning, and offer dispute resolution. Cash payments offer immediate settlement, no transaction fees, privacy for some users, and simplicity. However, online payments through WorkerCall are generally recommended because they provide better security, automatic receipts, easier expense management, and full support for our loyalty program. Choose the payment method that works best for your situation, but remember that online payments offer more protection and convenience.',
        'WorkerCall নগদ এবং অনলাইন পেমেন্ট উভয় বিকল্পই অফার করে, প্রতিটিরই স্বতন্ত্র সুবিধা রয়েছে। অনলাইন পেমেন্ট আপনার সুরক্ষার জন্য লেনদেনের রেকর্ড প্রদান করে...',
        admin_user_id,
        'Platform Guide',
        'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
        true,
        0
    );

END $$;

