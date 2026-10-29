/**
 * OutreachBot Firebase Client Configuration
 * 
 * To connect your Firebase project:
 * 1. Go to https://console.firebase.google.com
 * 2. Select your project (or create one for free)
 * 3. Go to Project Settings (gear icon) > General > Your apps > Web app (</>)
 * 4. Copy the firebaseConfig values and paste them below:
 */

window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Allow custom config saved via the browser settings UI
try {
  const saved = localStorage.getItem('outreach_custom_firebase_config');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.apiKey && parsed.apiKey !== 'YOUR_API_KEY') {
      window.FIREBASE_CONFIG = parsed;
    }
  }
} catch (e) {}

// Utility check
function isFirebaseConfigured() {
  return !!(
    window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.apiKey &&
    window.FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
    window.FIREBASE_CONFIG.projectId &&
    window.FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID'
  );
}

// Initialize Firebase App if configured
window.initFirebase = function() {
  if (isFirebaseConfigured() && window.firebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      return firebase.auth();
    } catch (err) {
      console.error('Firebase initialization error:', err);
      return null;
    }
  }
  return null;
};
