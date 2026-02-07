# Security Alert - API Keys Exposed

## ⚠️ URGENT: Your API keys have been exposed in the public repository!

### Immediate Actions Required:

1. **Revoke/Regenerate ALL API Keys:**
   - Firebase API Key (AIzaSyCFTIqMvtSM1WhEjhe7pb7Tkix9ggDuS_s)
   - Gemini API Keys
   - Groq API Key

2. **How to Rotate Keys:**

#### Firebase:
1. Go to Firebase Console → Project Settings
2. Delete the current Web App or restrict the API key
3. Create a new Web App with new credentials

#### Gemini:
1. Go to https://makersuite.google.com/app/apikey
2. Delete the exposed key
3. Generate a new API key

#### Groq:
1. Go to https://console.groq.com/
2. Revoke the exposed key
3. Generate a new API key

3. **Update .gitignore to exclude backup files:**
   Add these lines to .gitignore:
   ```
   *_backup.*
   *_deduped.*
   *_final.*
   ```

4. **Use Environment Variables for Frontend:**
   Never hardcode API keys in frontend code.
   For Firebase (client-side is acceptable but use Firebase Security Rules):
   - Firebase API keys can be public BUT you MUST set up Firebase Security Rules
   - Use Firebase App Check for additional security

## Next Steps:
1. Rotate all keys immediately
2. Update .gitignore
3. Remove sensitive files from git history
4. Implement proper security measures
