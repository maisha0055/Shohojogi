const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'public', 'models');
// Use jsDelivr CDN for reliable downloads
const baseUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1'
];

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('✅ Created models directory:', modelsDir);
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('🔄 Downloading face-api.js models...\n');
  
  for (const model of models) {
    const url = `${baseUrl}/${model}`;
    const filepath = path.join(modelsDir, model);
    
    try {
      console.log(`Downloading: ${model}...`);
      await downloadFile(url, filepath);
      console.log(`✅ Downloaded: ${model}\n`);
    } catch (error) {
      console.error(`❌ Failed to download ${model}:`, error.message);
      console.log(`\n⚠️  Please download manually from: ${url}`);
      console.log(`   Save to: ${filepath}\n`);
    }
  }
  
  console.log('✨ Download complete!');
  console.log(`\n📁 Models saved to: ${modelsDir}`);
  console.log('\n✅ You can now use face verification in your app!');
}

downloadModels().catch(console.error);


