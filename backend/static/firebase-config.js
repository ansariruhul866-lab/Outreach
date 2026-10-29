/**
 * OutreachBot Firebase Client Configuration
 * Connected to project: outreach-71a0c
 */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyB3ba6NW9DFGxYZmD1ZX6OUMyEEk45ipL8",
  authDomain: "outreach-71a0c.firebaseapp.com",
  projectId: "outreach-71a0c",
  storageBucket: "outreach-71a0c.firebasestorage.app",
  messagingSenderId: "670213371259",
  appId: "1:670213371259:web:66282ab5d8a585d562f9de",
  measurementId: "G-QWMVQHPEJB"
};

// Allow custom config saved via the browser settings UI if needed
try {
  const saved = localStorage.getItem('outreach_custom_firebase_config');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.apiKey) {
      window.FIREBASE_CONFIG = parsed;
    }
  }
} catch (e) {}

// Utility check
function isFirebaseConfigured() {
  return !!(
    window.FIREBASE_CONFIG &&
    window.FIREBASE_CONFIG.apiKey &&
    window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" &&
    window.FIREBASE_CONFIG.projectId
  );
}

// Initialize Firebase App
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
