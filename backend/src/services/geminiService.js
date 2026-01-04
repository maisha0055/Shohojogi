const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache for quota status to prevent multiple simultaneous requests
const quotaCache = {
  isExceeded: false,
  retryAfter: null,
  lastCheck: null,
  cacheDuration: 300000, // Cache for 5 minutes to prevent repeated attempts
  lastModel: null,
  modelQuotaMap: {}, // Track quota per model
  apiKey: null // Track which API key was used
};

// Clear cache when API key changes
const currentApiKey = process.env.GEMINI_API_KEY;
if (quotaCache.apiKey && quotaCache.apiKey !== currentApiKey) {
  console.log('[Gemini] API key changed, clearing quota cache...');
  quotaCache.isExceeded = false;
  quotaCache.retryAfter = null;
  quotaCache.lastCheck = null;
  quotaCache.modelQuotaMap = {};
}
quotaCache.apiKey = currentApiKey;

/**
 * Extract NID information from image using Gemini AI with comprehensive OCR
 * @param {string} imageUrl - URL or base64 of the NID image
 * @returns {object} Extracted NID data with all required fields
 */
const extractNIDData = async (imageUrl) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Try different models in order of preference (free tier models with separate quotas)
    // Start with lite models which often have better availability
    let model;
    const modelNames = ['gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    
    // Check which models have quota issues and skip them
    const now = Date.now();
    const availableModels = modelNames.filter(modelName => {
      const modelQuota = quotaCache.modelQuotaMap[modelName];
      if (!modelQuota) return true; // No quota info, assume available
      if (!modelQuota.isExceeded) return true; // Not exceeded, available
      if (modelQuota.lastCheck && (now - modelQuota.lastCheck) > quotaCache.cacheDuration) {
        // Cache expired, allow retry
        delete quotaCache.modelQuotaMap[modelName];
        return true;
      }
      // Still in quota error period
      return false;
    });
    
    if (availableModels.length === 0) {
      // All models have quota issues, return error
      const firstModelQuota = quotaCache.modelQuotaMap[modelNames[0]];
      const remainingSeconds = firstModelQuota?.retryAfter 
        ? Math.ceil((firstModelQuota.retryAfter * 1000 - (now - (firstModelQuota.lastCheck || now))) / 1000)
        : null;
      
      return {
        success: false,
        error: 'All Gemini models have quota exceeded. Please wait before retrying.',
        quotaExceeded: true,
        retryAfter: remainingSeconds,
        suggestion: 'All available models have exceeded their quota. Please wait for the quota to reset (usually 24 hours) or upgrade your API key.'
      };
    }
    
    // Try available models
    for (const modelName of availableModels) {
      try {
        model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.1, // Low temperature for accurate extraction
          }
        });
        quotaCache.lastModel = modelName; // Track which model we're using
        console.log(`[Gemini] Using model: ${modelName}`);
        break;
      } catch (err) {
        console.log(`[Gemini] Model ${modelName} failed: ${err.message}`);
        continue;
      }
    }
    
    if (!model) {
      throw new Error('No available Gemini model found. Please check your API key.');
    }

    // Comprehensive prompt for NID extraction with all required fields
    const prompt = `
You are an expert OCR system specialized in extracting data from Bangladesh National ID Cards (NID).

Analyze this NID image and extract ALL available information. Return ONLY a valid JSON object with the following structure:

{
  "full_name": "Full name as shown on NID (convert Bangla to English if needed, or keep original)",
  "nid_number": "NID number (digits only, no spaces or dashes)",
  "date_of_birth": "YYYY-MM-DD format (if visible, otherwise null)",
  "gender": "Male/Female/Other or null if not visible",
  "address": "Complete address as shown on NID (or null if not visible)",
  "father_name": "Father's name (or null if not visible)",
  "mother_name": "Mother's name (or null if not visible)",
  "language_detected": "Bangla/English/Mixed - based on text in the image",
  "image_quality": "Good/Average/Poor - assess clarity, focus, and readability",
  "tampering_suspected": true/false - check for signs of editing, photoshop, or manipulation,
  "extraction_confidence": 0-100 - overall confidence in the extraction accuracy,
  "is_valid_nid": true/false - whether this appears to be a genuine Bangladesh NID card
}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. NID number must be exactly 10, 13, or 17 digits (numeric only)
3. Date of birth must be in YYYY-MM-DD format if available
4. extraction_confidence must be an integer between 0-100
5. If image quality is poor or tampering is suspected, set tampering_suspected to true
6. If this doesn't look like a Bangladesh NID, set is_valid_nid to false
7. Be strict - if you cannot clearly read a field, use null
8. Check for signs of image manipulation, editing, or tampering
9. Assess image quality based on clarity, focus, lighting, and resolution
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
    
    // Parse JSON response (Gemini should return JSON directly with responseMimeType)
    let extractedData;
    try {
      const text = response.text();
      // Remove markdown code blocks if present (fallback)
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to get JSON directly from response if available
      try {
        const candidates = response.candidates;
        if (candidates && candidates[0] && candidates[0].content) {
          const content = candidates[0].content.parts[0];
          if (content.text) {
            extractedData = JSON.parse(content.text.replace(/```json\n?|\n?```/g, '').trim());
          }
        }
      } catch (e) {
        console.error('Failed to parse Gemini response:', response);
        throw new Error('Failed to parse NID data from image. Please ensure the image is clear and contains a valid Bangladesh NID.');
      }
    }

    // Validate extracted data structure
    if (!extractedData || typeof extractedData !== 'object') {
      throw new Error('Invalid data structure received from OCR');
    }

    // Validate NID card authenticity
    if (extractedData.is_valid_nid === false) {
      throw new Error('This does not appear to be a valid Bangladesh NID card');
    }

    // Validate required fields
    if (!extractedData.nid_number) {
      throw new Error('Could not extract NID number from image. Please ensure the NID number is clearly visible.');
    }

    // Validate and clean NID number format
    const nidNumber = extractedData.nid_number.toString().replace(/\D/g, '');
    if (![10, 13, 17].includes(nidNumber.length)) {
      throw new Error(`Invalid NID number format. Expected 10, 13, or 17 digits, got ${nidNumber.length}`);
    }
    extractedData.nid_number = nidNumber;

    // Validate extraction confidence
    if (extractedData.extraction_confidence === undefined || extractedData.extraction_confidence === null) {
      // Estimate confidence based on available fields
      let confidence = 50;
      if (extractedData.full_name) confidence += 20;
      if (extractedData.date_of_birth) confidence += 15;
      if (extractedData.address) confidence += 10;
      if (extractedData.gender) confidence += 5;
      extractedData.extraction_confidence = Math.min(confidence, 100);
    }

    // Ensure confidence is within valid range
    extractedData.extraction_confidence = Math.max(0, Math.min(100, parseInt(extractedData.extraction_confidence) || 0));

    // Validate image quality field
    if (!['Good', 'Average', 'Poor'].includes(extractedData.image_quality)) {
      // Auto-assess based on confidence
      if (extractedData.extraction_confidence >= 80) {
        extractedData.image_quality = 'Good';
      } else if (extractedData.extraction_confidence >= 50) {
        extractedData.image_quality = 'Average';
      } else {
        extractedData.image_quality = 'Poor';
      }
    }

    // Validate language detected
    if (!extractedData.language_detected) {
      extractedData.language_detected = 'Mixed'; // Default if not detected
    }

    // Ensure tampering_suspected is boolean
    extractedData.tampering_suspected = Boolean(extractedData.tampering_suspected);

    return {
      success: true,
      data: extractedData
    };

  } catch (error) {
    console.error('Gemini NID extraction error:', error);
    
    // Handle quota exceeded errors
    if (error.message && (error.message.includes('Quota exceeded') || error.message.includes('quota'))) {
      const retryMatch = error.message.match(/Please retry in ([\d.]+)s/);
      const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
      
      // Update cache for the model that was used
      const usedModel = quotaCache.lastModel || 'gemini-2.0-flash-lite';
      if (!quotaCache.modelQuotaMap[usedModel]) {
        quotaCache.modelQuotaMap[usedModel] = {};
      }
      quotaCache.modelQuotaMap[usedModel].isExceeded = true;
      quotaCache.modelQuotaMap[usedModel].retryAfter = retrySeconds;
      quotaCache.modelQuotaMap[usedModel].lastCheck = Date.now();
      
      console.log(`[Gemini] Quota exceeded for model: ${usedModel}, retry after: ${retrySeconds}s`);
      
      // Also update global cache
      quotaCache.isExceeded = true;
      quotaCache.retryAfter = retrySeconds;
      quotaCache.lastCheck = Date.now();
      
      // If retry time is very short (< 60 seconds), it's likely a rate limit, not daily quota
      if (retrySeconds && retrySeconds < 60) {
        return {
          success: false,
          error: `Rate limit reached. Please wait ${retrySeconds} seconds before trying again.`,
          quotaExceeded: true,
          rateLimited: true,
          retryAfter: retrySeconds,
          suggestion: `The API is rate-limited. Please wait ${retrySeconds} seconds and try again.`
        };
      }
      
      // Daily quota exceeded
      return {
        success: false,
        error: 'Gemini API daily quota exceeded. The free tier limit has been reached for today.',
        quotaExceeded: true,
        dailyQuotaExceeded: true,
        retryAfter: retrySeconds,
        suggestion: retrySeconds 
          ? `Please wait ${retrySeconds} seconds, or the quota will reset in 24 hours. Consider upgrading your API key for higher limits.`
          : 'The daily quota has been exceeded. It will reset in 24 hours. Please upgrade your Gemini API key or wait until tomorrow. Visit https://ai.google.dev/gemini-api/docs/rate-limits for more information.'
      };
    }
    
    // Handle model not found errors
    if (error.status === 404 || (error.message && error.message.includes('not found'))) {
      return {
        success: false,
        error: 'The selected Gemini model is not available. Please check your API key permissions or try a different model.',
        modelError: true
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to extract NID data from image. Please ensure the image is clear and contains a valid Bangladesh NID.'
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