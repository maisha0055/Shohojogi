const axios = require('axios');
require('dotenv').config();

/**
 * Extract NID information from image using OCR.Space API
 * @param {string} imageUrl - URL or base64 of the NID image
 * @returns {object} Extracted NID data with all required fields
 */
const extractNIDData = async (imageUrl) => {
  try {
    if (!process.env.OCR_SPACE_API_KEY) {
      throw new Error('OCR_SPACE_API_KEY is not configured');
    }

    console.log('[OCR.Space] Starting NID data extraction...');

    // Prepare image data for OCR.Space API
    let imageBase64 = null;
    let imageUrlForOCR = null;

    if (imageUrl.startsWith('data:')) {
      // Extract base64 from data URL
      imageBase64 = imageUrl.split(',')[1];
    } else if (imageUrl.startsWith('http')) {
      // Use URL directly
      imageUrlForOCR = imageUrl;
    } else {
      // Assume it's already base64
      imageBase64 = imageUrl;
    }

    // Call OCR.Space API
    const FormData = require('form-data');
    const formData = new FormData();
    
    if (imageBase64) {
      // OCR.Space accepts data URI format: data:image/jpeg;base64,{base64string}
      formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);
    } else if (imageUrlForOCR) {
      formData.append('url', imageUrlForOCR);
    }

    formData.append('apikey', process.env.OCR_SPACE_API_KEY);
    formData.append('language', 'eng'); // English for better NID recognition
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

    const response = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: {
        'apikey': process.env.OCR_SPACE_API_KEY,
        ...formData.getHeaders()
      },
      timeout: 60000, // 60 seconds timeout for OCR processing
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (!response.data || response.data.OCRExitCode !== 1) {
      const errorMessage = response.data?.ErrorMessage?.[0] || 'OCR processing failed';
      console.error('[OCR.Space] API Error:', errorMessage);
      return {
        success: false,
        error: `OCR processing failed: ${errorMessage}`
      };
    }

    // Extract all text from OCR result
    const parsedResults = response.data.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) {
      return {
        success: false,
        error: 'No text could be extracted from the image. Please ensure the NID image is clear and readable.'
      };
    }

    const extractedText = parsedResults.map(result => result.ParsedText).join('\n');
    console.log('[OCR.Space] Extracted text:', extractedText.substring(0, 200) + '...');

    // Parse extracted text to extract NID data
    const extractedData = parseNIDText(extractedText);

    // Validate extracted data
    if (!extractedData.full_name && !extractedData.nid_number) {
      return {
        success: false,
        error: 'Could not extract essential NID information (name or NID number) from the image. Please ensure the image is clear and contains a valid Bangladesh NID.'
      };
    }

    // Calculate confidence based on extracted fields
    let confidence = 50; // Base confidence
    if (extractedData.full_name) confidence += 20;
    if (extractedData.nid_number) confidence += 20;
    if (extractedData.date_of_birth) confidence += 10;
    extractedData.extraction_confidence = Math.min(confidence, 100);

    // Set default values for missing fields
    extractedData.image_quality = extractedData.image_quality || 'Average';
    extractedData.tampering_suspected = extractedData.tampering_suspected || false;
    extractedData.language_detected = extractedData.language_detected || 'Mixed';

    console.log('[OCR.Space] Parsed NID data:', extractedData);

    return {
      success: true,
      data: extractedData
    };

  } catch (error) {
    console.error('[OCR.Space] Extraction error:', error);
    console.error('[OCR.Space] Error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        success: false,
        error: 'Request timeout. The OCR service took too long to process the image. Please try again with a smaller or clearer image.',
        timeout: true,
        suggestion: 'Try uploading a smaller image file or ensure the image is clear and well-lit.'
      };
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Network error. Could not connect to OCR service. Please check your internet connection and try again.',
        networkError: true,
        suggestion: 'Please check your internet connection and try again.'
      };
    }
    
    // Handle quota/rate limit errors
    if (error.response?.status === 429 || error.response?.status === 403) {
      return {
        success: false,
        error: 'OCR API quota exceeded. Please wait and try again later.',
        quotaExceeded: true,
        suggestion: 'The OCR API quota has been exceeded. Please wait for the quota to reset or upgrade your API key.'
      };
    }

    // Handle API errors
    if (error.response?.data) {
      const apiError = error.response.data;
      if (apiError.OCRExitCode && apiError.OCRExitCode !== 1) {
        const errorMessage = apiError.ErrorMessage?.[0] || 'OCR processing failed';
        return {
          success: false,
          error: `OCR processing failed: ${errorMessage}`,
          apiError: true
        };
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to extract NID data from image. Please ensure the image is clear and contains a valid Bangladesh NID.'
    };
  }
};

/**
 * Parse OCR text to extract NID information
 * Uses regex patterns to identify NID fields
 */
const parseNIDText = (text) => {
  const extracted = {
    full_name: null,
    nid_number: null,
    date_of_birth: null,
    gender: null,
    address: null,
    language_detected: 'Mixed',
    image_quality: 'Average',
    tampering_suspected: false
  };

  // Clean text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  console.log('[OCR.Space] Parsing text:', cleanText.substring(0, 200));

  // Extract NID number - look for "ID NO" keyword first, then fallback to pattern
  let nidMatch = cleanText.match(/(?:ID\s*NO\.?|ID\s*Number|জাতীয়\s*পরিচয়\s*নম্বর)[:\s]*(\d{10,17})/i);
  if (nidMatch) {
    extracted.nid_number = nidMatch[1];
  } else {
    // Fallback: Find longest sequence of digits (10, 13, or 17 digits)
    const allNumbers = cleanText.match(/\d{10,17}/g);
    if (allNumbers && allNumbers.length > 0) {
      // Take the longest one (most likely to be NID)
      extracted.nid_number = allNumbers.reduce((a, b) => a.length >= b.length ? a : b);
    }
  }

  // Extract name - look for "Name:" keyword
  let nameMatch = cleanText.match(/(?:Name|নাম)[:\s]+((?:MD\.|MR\.|MRS\.|MS\.)?\s*[A-Z][A-Z\s.]+?)(?:\s+(?:Date|ID|Father|Mother|জন্ম|পিতা|মাতা))/i);
  if (nameMatch) {
    extracted.full_name = nameMatch[1].trim().replace(/\s+/g, ' ');
  } else {
    // Fallback: Look for line with "Name:" and extract next meaningful text
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/(?:Name|নাম)/i.test(line)) {
        // Check current line after "Name:"
        const nameInLine = line.match(/(?:Name|নাম)[:\s]+(.+)/i);
        if (nameInLine && nameInLine[1].trim().length > 2) {
          extracted.full_name = nameInLine[1].trim().replace(/\s+/g, ' ');
          break;
        }
        // Check next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.length > 2 && nextLine.length < 50 && !/^\d+$/.test(nextLine)) {
            extracted.full_name = nextLine.replace(/\s+/g, ' ');
            break;
          }
        }
      }
    }
  }

  // Clean up name - remove common header text
  if (extracted.full_name) {
    extracted.full_name = extracted.full_name
      .replace(/Government\s+of\s+the\s+People'?s\s+Republic\s+of\s+Bangladesh/gi, '')
      .replace(/Temporary\s+National\s+(ID\s+)?Card/gi, '')
      .replace(/জাতীয়\s*পরিচয়পত্র/g, '')
      .trim();
    
    // If name is too short or still contains unwanted text, set to null
    if (extracted.full_name.length < 3 || /government|republic|temporary|national/i.test(extracted.full_name)) {
      extracted.full_name = null;
    }
  }

  // Extract date of birth - handle various formats including month names
  const monthNames = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
  };

  // Look for "Date of Birth:" keyword
  let dobMatch = cleanText.match(/(?:Date\s+of\s+Birth|DOB|জন্ম\s*তারিখ)[:\s]*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
  if (dobMatch) {
    const day = dobMatch[1].padStart(2, '0');
    const month = monthNames[dobMatch[2].toLowerCase()] || '01';
    const year = dobMatch[3];
    extracted.date_of_birth = `${year}-${month}-${day}`;
  } else {
    // Try numeric formats
    const dobPatterns = [
      /(?:Date\s+of\s+Birth|DOB|জন্ম\s*তারিখ)[:\s]*(\d{1,2})[-/](\d{1,2})[-/](\d{4})/i,
      /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
      /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/
    ];

    for (const pattern of dobPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let day, month, year;
        if (pattern.source.startsWith('\\b(\\d{4})')) {
          // YYYY-MM-DD format
          year = match[1];
          month = match[2].padStart(2, '0');
          day = match[3].padStart(2, '0');
        } else {
          // DD-MM-YYYY format
          day = match[1].padStart(2, '0');
          month = match[2].padStart(2, '0');
          year = match[3];
        }
        extracted.date_of_birth = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  // Extract gender
  const genderPattern = /\b(Male|Female|M|F|পুরুষ|মহিলা)\b/i;
  const genderMatch = cleanText.match(genderPattern);
  if (genderMatch) {
    const gender = genderMatch[1].toLowerCase();
    if (gender === 'm' || gender === 'male' || gender === 'পুরুষ') {
      extracted.gender = 'Male';
    } else if (gender === 'f' || gender === 'female' || gender === 'মহিলা') {
      extracted.gender = 'Female';
    }
  }

  // Detect language
  const banglaPattern = /[\u0980-\u09FF]/;
  const hasBangla = banglaPattern.test(text);
  const hasEnglish = /[A-Za-z]/.test(text);
  
  if (hasBangla && hasEnglish) {
    extracted.language_detected = 'Mixed';
  } else if (hasBangla) {
    extracted.language_detected = 'Bangla';
  } else if (hasEnglish) {
    extracted.language_detected = 'English';
  }

  // Assess image quality (based on text clarity)
  const textLength = cleanText.length;
  const hasNumbers = /\d/.test(cleanText);
  const hasLetters = /[A-Za-z]/.test(cleanText);
  
  if (textLength > 100 && hasNumbers && hasLetters) {
    extracted.image_quality = 'Good';
  } else if (textLength > 50) {
    extracted.image_quality = 'Average';
  } else {
    extracted.image_quality = 'Poor';
  }

  console.log('[OCR.Space] Extracted fields:', extracted);

  return extracted;
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    return null;
  }
};

/**
 * Calculate name similarity (simple implementation)
 */
const calculateNameSimilarity = (name1, name2) => {
  if (!name1 || !name2) return 0;
  
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return 1;
  
  // Simple word-based similarity
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
};

/**
 * Compare extracted NID data with user-provided data
 * (For compatibility with existing code)
 */
const compareNIDData = (extractedData, userData) => {
  const mismatches = [];
  let matchScore = 0;
  const totalPossibleScore = 100;

  // NID Number comparison (50 points)
  if (extractedData.nid_number && userData.nid_number) {
    const extractedNID = extractedData.nid_number.replace(/\D/g, '');
    const userNID = userData.nid_number.replace(/\D/g, '');
    if (extractedNID === userNID) {
      matchScore += 50;
    } else {
      mismatches.push({ field: 'nid_number', extracted: extractedNID, provided: userNID });
    }
  }

  // Full Name comparison (30 points)
  if (extractedData.full_name && userData.full_name) {
    const similarity = calculateNameSimilarity(extractedData.full_name, userData.full_name);
    if (similarity >= 0.7) {
      matchScore += 30;
    } else {
      mismatches.push({ 
        field: 'full_name', 
        extracted: extractedData.full_name, 
        provided: userData.full_name, 
        similarity: `${Math.round(similarity * 100)}%` 
      });
    }
  }

  // Date of Birth comparison (20 points)
  if (extractedData.date_of_birth && userData.date_of_birth) {
    if (extractedData.date_of_birth === userData.date_of_birth) {
      matchScore += 20;
    } else {
      mismatches.push({ 
        field: 'date_of_birth', 
        extracted: extractedData.date_of_birth, 
        provided: userData.date_of_birth 
      });
    }
  }

  const isMatch = matchScore >= 70;
  const confidence = extractedData.extraction_confidence || 0;

  let recommendation = 'Manual review required';
  if (isMatch && confidence >= 70 && !extractedData.tampering_suspected) {
    recommendation = 'Approve verification';
  } else if (extractedData.tampering_suspected) {
    recommendation = 'Auto-reject: Tampering suspected';
  } else if (confidence < 50) {
    recommendation = 'Auto-reject: Low extraction confidence';
  } else if (mismatches.length > 0) {
    recommendation = 'Data mismatch - review required';
  }

  return {
    isMatch,
    matchScore,
    confidence,
    mismatches,
    recommendation,
    tampering_suspected: extractedData.tampering_suspected,
    image_quality: extractedData.image_quality,
    language_detected: extractedData.language_detected
  };
};

module.exports = {
  extractNIDData,
  calculateAge,
  calculateNameSimilarity,
  compareNIDData
};

