# ⚠️ Important: Firebase Configuration Required

## Setup Instructions

Before running the application, you need to configure Firebase:

### 1. Create your Firebase configuration file:

```bash
cd frontend
cp firebase-config.template.js firebase-config.js
```

### 2. Get your Firebase credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click ⚙️ Settings → Project Settings
4. Scroll to "Your apps" section
5. Click on your Web app (or create one)
6. Copy the configuration object

### 3. Update `frontend/firebase-config.js`:

Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 4. Include the config in your HTML:

Make sure `index.html` includes:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore-compat.js"></script>

<!-- Your Firebase Config -->
<script src="firebase-config.js"></script>

<!-- Your App -->
<script src="app.js"></script>
```

## Security Note

- ✅ `firebase-config.js` is in `.gitignore` and will NOT be committed
- ✅ `firebase-config.template.js` is the template for reference
- ⚠️ Never commit your actual Firebase credentials to git
- 🔒 Configure Firebase Security Rules to protect your data

## Need Help?

See the main [README.md](../README.md) for full setup instructions.
