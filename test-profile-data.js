// Test script to check user data and profile API
async function testProfileData() {
    try {
        // First, try to log in as admin user
        console.log('🔐 Testing login...');
        const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'john.admin@example.com',
                password: 'admin123'  // Assuming this is the password
            }),
            credentials: 'include'
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginResponse.status, loginData);

        if (loginResponse.ok) {
            // Now test the profile API
            console.log('👤 Testing profile API...');
            const profileResponse = await fetch('http://localhost:8000/api/auth/profile', {
                method: 'GET',
                credentials: 'include'
            });

            const profileData = await profileResponse.json();
            console.log('Profile response:', profileResponse.status, profileData);

            if (profileResponse.ok && profileData.user) {
                console.log('✅ User data structure:');
                console.log('- ID:', profileData.user.id);
                console.log('- Email:', profileData.user.email);
                console.log('- First Name:', profileData.user.firstName);
                console.log('- Last Name:', profileData.user.lastName);
                console.log('- Roles:', profileData.user.roles);
            }
        }
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testProfileData();