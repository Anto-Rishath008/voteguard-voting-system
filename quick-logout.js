// Quick logout script - run this in browser console on localhost:3000
// This will clear your authentication and let you see the homepage

console.log('🚪 Logging out to view homepage...');

// Clear the auth cookie
document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

// Clear any localStorage/sessionStorage
localStorage.clear();
sessionStorage.clear();

// Reload the page
setTimeout(() => {
  window.location.reload();
}, 100);

console.log('✅ Cleared authentication - page will reload to show homepage');