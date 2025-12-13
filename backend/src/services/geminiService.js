const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extract NID information from image using Gemini AI
 * @param {string} imageUrl - URL or base64 of the NID image
 * @returns {object} Extracted NID data
 */
const extractNIDData = async (imageUrl) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare the prompt for NID extraction
    const prompt = `
      You are an expert at extracting information from Bangladesh National ID Cards (NID).
      
      Please analyze this image and extract the following information in JSON format:
      {
        "full_name": "Full name as shown on NID (in English)",
        "nid_number": "NID number (numeric only)",
        "date_of_birth": "Date of birth (if visible)",
        "father_name": "Father's name (if visible)",
        "mother_name": "Mother's name (if visible)",
        "address": "Address (if visible)",
        "is_valid_nid": true/false (whether this looks like a valid Bangladesh NID),
        "confidence_score": 0-100 (how confident you are in the extraction)
      }
      
      Important:
      - Return ONLY valid JSON, no additional text
      - If a field is not visible, use null
      - NID number should be 10, 13, or 17 digits
      - Ensure the card appears to be a genuine Bangladesh NID
      - If this doesn't look like a Bangladesh NID, set is_valid_nid to false
    `;

    // Handle different image formats
    let imageParts;
    
    if (imageUrl.startsWith('http')) {
      // Download image from URL
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      imageParts = [
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        }
      ];
    } else if (imageUrl.startsWith('data:')) {
      // Handle base64 data URL
      const base64Data = imageUrl.split(',')[1];
      const mimeType = imageUrl.split(';')[0].split(':')[1];
      
      imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ];
    } else {
      // Assume it's already base64
      imageParts = [
        {
          inlineData: {
            data: imageUrl,
            mimeType: 'image/jpeg'
          }
        }
      ];
    }

    // Generate content with image and prompt
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Failed to parse NID data from image');
    }

    // Validate extracted data
    if (!extractedData.is_valid_nid) {
      throw new Error('This does not appear to be a valid Bangladesh NID');
    }

    if (!extractedData.nid_number) {
      throw new Error('Could not extract NID number from image');
    }

    // Validate NID number format
    const nidNumber = extractedData.nid_number.replace(/\D/g, '');
    if (![10, 13, 17].includes(nidNumber.length)) {
      throw new Error('Invalid NID number format');
    }

    // Clean up the NID number
    extractedData.nid_number = nidNumber;

    return {
      success: true,
      data: extractedData
    };

  } catch (error) {
    console.error('Gemini NID extraction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to extract NID data'
    };
  }
};

/**
 * Compare extracted NID data with user-provided data
 * @param {object} extractedData - Data extracted from NID by Gemini
 * @param {object} userData - Data provided by user
 * @returns {object} Comparison result
 */
const compareNIDData = (extractedData, userData) => {
  const mismatches = [];
  let matchScore = 0;
  let totalChecks = 0;

  // Compare NID number (most important)
  if (extractedData.nid_number && userData.nid_number) {
    totalChecks++;
    if (extractedData.nid_number === userData.nid_number.replace(/\D/g, '')) {
      matchScore += 50; // NID match is worth 50%
    } else {
      mismatches.push({
        field: 'nid_number',
        extracted: extractedData.nid_number,
        provided: userData.nid_number
      });
    }
  }

  // Compare name (important)
  if (extractedData.full_name && userData.full_name) {
    totalChecks++;
    const extractedName = extractedData.full_name.toLowerCase().trim();
    const providedName = userData.full_name.toLowerCase().trim();
    
    // Allow fuzzy matching for names (70% similarity threshold)
    const similarity = calculateStringSimilarity(extractedName, providedName);
    if (similarity >= 0.7) {
      matchScore += 30; // Name match is worth 30%
    } else {
      mismatches.push({
        field: 'full_name',
        extracted: extractedData.full_name,
        provided: userData.full_name,
        similarity: Math.round(similarity * 100) + '%'
      });
    }
  }

  // Compare date of birth (if available)
  if (extractedData.date_of_birth && userData.date_of_birth) {
    totalChecks++;
    if (extractedData.date_of_birth === userData.date_of_birth) {
      matchScore += 20; // DOB match is worth 20%
    } else {
      mismatches.push({
        field: 'date_of_birth',
        extracted: extractedData.date_of_birth,
        provided: userData.date_of_birth
      });
    }
  }

  const isMatch = matchScore >= 70; // Require at least 70% match

  return {
    isMatch,
    matchScore,
    confidence: extractedData.confidence_score || 0,
    mismatches,
    recommendation: isMatch 
      ? 'Approve verification' 
      : mismatches.length > 0 
        ? 'Data mismatch - review required' 
        : 'Manual verification required'
  };
};

/**
 * Calculate string similarity (Levenshtein distance)
 */
const calculateStringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const getEditDistance = (str1, str2) => {
  const costs = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  return costs[str2.length];
};

module.exports = {
  extractNIDData,
  compareNIDData
};