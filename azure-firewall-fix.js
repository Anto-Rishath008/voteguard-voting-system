console.log('🔧 Azure PostgreSQL Connection Troubleshooting\n');

console.log('✅ Current Status:');
console.log('   - Server: Running at http://localhost:8000');
console.log('   - Database: voteguard-db-4824 (Ready in Azure Portal)');
console.log('   - Connection String: Using Azure PostgreSQL');

console.log('\n❌ Issue: ETIMEDOUT / ECONNREFUSED errors');
console.log('   This means your LOCAL IP is not allowed through Azure firewall');

console.log('\n🔧 SOLUTION - Add your IP to Azure Firewall:');
console.log('1. Go to Azure Portal');
console.log('2. Navigate to: voteguard-db-4824 database');
console.log('3. Click "Networking" in left sidebar');
console.log('4. Under "Firewall rules":');
console.log('   - Check "Allow Azure services and resources to access this server"');
console.log('   - Click "Add your client IP address" button');
console.log('   - OR manually add rule:');
console.log('     * Rule name: "LocalDevelopment"');
console.log('     * Start IP: Your public IP');
console.log('     * End IP: Your public IP');
console.log('5. Click "Save"');
console.log('6. Wait 2-3 minutes for changes to apply');

console.log('\n🌐 Find your public IP:');
console.log('   Visit: https://whatismyipaddress.com/');
console.log('   Or run: curl ipinfo.io/ip');

console.log('\n🚀 After fixing firewall:');
console.log('   - Restart this server');
console.log('   - Test login at http://localhost:8000');
console.log('   - Database connections should work');

console.log('\n💡 Alternative: Enable "Allow Azure services" checkbox');
console.log('   This is quicker but less secure for production');

// Get local IP for reference
const os = require('os');
const networkInterfaces = os.networkInterfaces();
const localIPs = [];

Object.keys(networkInterfaces).forEach(interface => {
  networkInterfaces[interface].forEach(config => {
    if (config.family === 'IPv4' && !config.internal) {
      localIPs.push(config.address);
    }
  });
});

console.log('\n🏠 Your local network IP(s):', localIPs.join(', '));
console.log('   (You need your PUBLIC IP for Azure firewall, not these local ones)');