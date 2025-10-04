// This is a simple test to verify the homepage behavior
// Run this in browser console on localhost:3000

console.log('🏠 Testing Homepage Behavior...');

// Check if we're on the homepage
if (window.location.pathname === '/') {
  console.log('✅ Currently on homepage path');
  
  // Check if landing page content is visible
  const title = document.querySelector('h1');
  if (title && title.textContent.includes('Secure Electronic Voting')) {
    console.log('✅ Landing page content is visible');
  } else {
    console.log('❌ Landing page content not found');
  }
  
  // Check for login/register buttons
  const loginBtn = document.querySelector('a[href="/login"]');
  const registerBtn = document.querySelector('a[href="/register"]');
  
  if (loginBtn) {
    console.log('✅ Login button found');
  } else {
    console.log('❌ Login button not found');
  }
  
  if (registerBtn) {
    console.log('✅ Register button found');
  } else {
    console.log('❌ Register button not found');
  }
  
} else {
  console.log(`❌ Not on homepage - current path: ${window.location.pathname}`);
}

// Check if user is authenticated
fetch('/api/auth/profile')
  .then(response => response.json())
  .then(data => {
    if (data.user) {
      console.log(`👤 User is authenticated: ${data.user.email}`);
      console.log('⏱️  Should redirect to dashboard in a moment...');
    } else {
      console.log('🔓 User is not authenticated - staying on homepage');
    }
  })
  .catch(() => {
    console.log('🔓 User is not authenticated - staying on homepage');
  });

console.log('🏠 Homepage test complete!');