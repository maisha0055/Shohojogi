# NID Verification System - Setup Guide

## 🚀 Quick Setup

### 1. Run Database Migration

```bash
cd backend
node scripts/run-nid-migration.js
```

Or manually execute `database/migration_nid_verification.sql` in pgAdmin.

### 2. Environment Variables

Add to your `.env` file:

```env
# Gemini API Key (Required for OCR)
GEMINI_API_KEY=your_gemini_api_key_here

# Encryption Key (32 bytes - generate a random string)
ENCRYPTION_KEY=your_32_byte_encryption_key_here
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Restart Backend Server

```bash
npm start
# or
npm run dev
```

## ✅ Verification

1. **Check Database Tables:**
   ```sql
   SELECT * FROM nid_verifications LIMIT 1;
   SELECT * FROM nid_verification_logs LIMIT 1;
   ```

2. **Test API Endpoints:**
   - `GET /api/verification/nid/status` - Should return verification status
   - `POST /api/verification/nid` - Submit NID verification

3. **Check Admin Panel:**
   - Login as admin
   - Navigate to "NID Verifications" tab
   - Should see pending verifications

## 📝 Usage

### For Users:
1. Login to your account
2. Go to Dashboard
3. Find "NID Verification" section
4. Upload NID image
5. Provide consent
6. Submit for verification

### For Admins:
1. Login as admin
2. Go to Admin Dashboard
3. Click "NID Verifications" tab
4. Review pending verifications
5. View extracted data and confidence scores
6. Approve or reject with reason

## 🔒 Security Features

- ✅ User consent required
- ✅ Images deleted after processing
- ✅ NID numbers encrypted in database
- ✅ NID uniqueness checking
- ✅ Tampering detection
- ✅ Age verification (18+)
- ✅ Confidence threshold validation
- ✅ Audit logging

## 🐛 Troubleshooting

### Migration Fails
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure you have CREATE TABLE permissions

### Gemini API Errors
- Verify `GEMINI_API_KEY` is set correctly
- Check API key has proper permissions
- Ensure you have quota available

### Image Upload Fails
- Check Cloudinary credentials in `.env`
- Verify file size is under 5MB
- Ensure image format is JPEG/PNG

## 📚 API Documentation

See `NID_VERIFICATION_IMPLEMENTATION.md` for complete API documentation.



