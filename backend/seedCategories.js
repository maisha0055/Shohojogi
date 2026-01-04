require('dotenv').config();
const { query } = require('./src/config/database');

const categories = [
  { name_en: 'Carpenter', name_bn: 'কাঠমিস্ত্রি', description_en: 'Furniture repair, wood work, door and window fixing', description_bn: 'আসবাবপত্র মেরামত, কাঠের কাজ, দরজা এবং জানালা ঠিক করা', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png' },
  { name_en: 'Electrician', name_bn: 'ইলেকট্রিশিয়ান', description_en: 'Electrical wiring, fixture installation, repair work', description_bn: 'বৈদ্যুতিক তারের কাজ, ফিক্সচার ইনস্টলেশন, মেরামতের কাজ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936756.png' },
  { name_en: 'Plumber', name_bn: 'প্লাম্বার', description_en: 'Pipe fixing, drainage system, water supply issues', description_bn: 'পাইপ ঠিক করা, নিকাশী ব্যবস্থা, পানি সরবরাহ সমস্যা', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936730.png' },
  { name_en: 'Mechanic', name_bn: 'মেকানিক', description_en: 'Vehicle repair, bike and car servicing', description_bn: 'যানবাহন মেরামত, বাইক এবং গাড়ি সার্ভিসিং', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936675.png' },
  { name_en: 'Painter', name_bn: 'চিত্রশিল্পী', description_en: 'House painting, wall decoration, color consultation', description_bn: 'ঘর রঙ করা, দেয়াল সাজসজ্জা, রঙের পরামর্শ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936682.png' },
  { name_en: 'AC Technician', name_bn: 'এসি টেকনিশিয়ান', description_en: 'Air conditioner installation, repair, and maintenance', description_bn: 'এয়ার কন্ডিশনার ইনস্টলেশন, মেরামত এবং রক্ষণাবেক্ষণ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936876.png' },
  { name_en: 'Cleaning Service', name_bn: 'পরিষ্কার সেবা', description_en: 'Home cleaning, office cleaning, deep cleaning', description_bn: 'বাড়ি পরিষ্কার, অফিস পরিষ্কার, গভীর পরিষ্কার', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936749.png' },
  { name_en: 'Key Maker', name_bn: 'চাবি প্রস্তুতকারক', description_en: 'Key duplication, lock repair, emergency lockout service', description_bn: 'চাবি নকল, তালা মেরামত, জরুরী লকআউট সেবা', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936798.png' },
  { name_en: 'Gardener', name_bn: 'মালী', description_en: 'Garden maintenance, lawn care, plant care', description_bn: 'বাগান রক্ষণাবেক্ষণ, লন যত্ন, উদ্ভিদ যত্ন', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936820.png' },
  { name_en: 'Mason', name_bn: 'রাজমিস্ত্রি', description_en: 'Brick work, wall construction, tiling work', description_bn: 'ইটের কাজ, দেয়াল নির্মাণ, টাইল করার কাজ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936864.png' },
  { name_en: 'Welder', name_bn: 'ওয়েল্ডার', description_en: 'Metal welding, gate repair, grill work', description_bn: 'ধাতব ওয়েল্ডিং, গেট মেরামত, গ্রিলের কাজ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936722.png' },
  { name_en: 'CCTV Technician', name_bn: 'সিসিটিভি টেকনিশিয়ান', description_en: 'CCTV installation, security camera setup', description_bn: 'সিসিটিভি ইনস্টলেশন, নিরাপত্তা ক্যামেরা সেটআপ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936808.png' },
  { name_en: 'Pest Control', name_bn: 'কীটপতঙ্গ নিয়ন্ত্রণ', description_en: 'Pest removal, fumigation, mosquito control', description_bn: 'কীটপতঙ্গ অপসারণ, ধূমপান, মশা নিয়ন্ত্রণ', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936844.png' },
  { name_en: 'Appliance Repair', name_bn: 'যন্ত্রপাতি মেরামত', description_en: 'Refrigerator, washing machine, oven repair', description_bn: 'রেফ্রিজারেটর, ওয়াশিং মেশিন, ওভেন মেরামত', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936790.png' },
  { name_en: 'Tailor', name_bn: 'দরজি', description_en: 'Clothes stitching, alteration, custom tailoring', description_bn: 'পোশাক সেলাই, পরিবর্তন, কাস্টম টেইলারিং', icon_url: 'https://cdn-icons-png.flaticon.com/512/2936/2936714.png' }
];

async function seedCategories() {
  console.log('🌱 Seeding service categories...\n');
  
  for (const category of categories) {
    try {
      // Check if category exists
      const existing = await query('SELECT id FROM service_categories WHERE name_en = $1', [category.name_en]);
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  Category "${category.name_en}" already exists, skipping...`);
      } else {
        await query(
          `INSERT INTO service_categories (name_en, name_bn, description_en, description_bn, icon_url, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [category.name_en, category.name_bn, category.description_en, category.description_bn, category.icon_url, true]
        );
        console.log(`✅ Created: ${category.name_en}`);
      }
    } catch (error) {
      console.error(`❌ Error creating category ${category.name_en}:`, error.message);
    }
  }
  
  console.log('\n✅ Category seeding completed!\n');
}

seedCategories().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});



