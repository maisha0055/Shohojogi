# Gemini API Quota Information

## Current Issue: Free Tier Quota Exceeded

Your Gemini API key has reached the free tier quota limit. Here are your options:

### Option 1: Wait and Retry
- The quota resets daily
- Check the retry time in the error message
- Wait for the quota to reset (usually 24 hours)

### Option 2: Upgrade Your API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Check your API key usage and limits
3. Upgrade to a paid plan for higher quotas
4. Or create a new API key if you have multiple projects

### Option 3: Use a Different Model
The system is currently using `gemini-2.0-flash`. You can try:
- `gemini-2.5-flash` (if available)
- `gemini-2.5-pro` (if available)

### Option 4: Manual Verification (Temporary)
Until the quota resets, admins can manually verify NID submissions by:
1. Reviewing the uploaded NID image
2. Manually entering the extracted data
3. Approving the verification

## Quota Limits (Free Tier)
- **Requests per day**: Limited (varies by model)
- **Input tokens**: Limited per day
- **Rate limits**: Requests per minute

## Learn More
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Google AI Studio](https://aistudio.google.com/)

## Temporary Workaround
If you need to test the system immediately, you can:
1. Use a different Google account to create a new API key
2. Update the `GEMINI_API_KEY` in `.env`
3. Restart the server



