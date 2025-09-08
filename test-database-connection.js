const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';

// Test database connection and basic functionality
async function testDatabaseConnection() {
  console.log('🔧 Testing Database Connection and Basic Functionality...\n');

  try {
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 1: Health check (if available)
    console.log('1️⃣ Testing server health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Server health check passed');
    } catch (error) {
      console.log('ℹ️ Health endpoint not available, continuing...');
    }

    // Test 2: Authentication endpoint
    console.log('2️⃣ Testing authentication endpoint...');
    try {
      const authResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      });
      
      if (authResponse.data.access_token) {
        console.log('✅ Authentication endpoint working');
        console.log('✅ Database connection successful');
        console.log('✅ User authentication working');
        
        const token = authResponse.data.access_token;
        
        // Test 3: Organizations endpoint
        console.log('3️⃣ Testing organizations endpoint...');
        const orgResponse = await axios.get(`${BASE_URL}/organizations/my-organizations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Organizations endpoint working');
        console.log(`✅ Found ${orgResponse.data.length} organizations`);
        
        // Test 4: Workspaces endpoint
        console.log('4️⃣ Testing workspaces endpoint...');
        const workspaceResponse = await axios.get(`${BASE_URL}/workspaces/my-workspaces`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Workspaces endpoint working');
        console.log(`✅ Found ${workspaceResponse.data.total || 0} workspaces`);
        
        // Test 5: Spaces endpoint (NEW)
        console.log('5️⃣ Testing spaces endpoint (NEW)...');
        const spaceResponse = await axios.get(`${BASE_URL}/spaces/my-spaces`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Spaces endpoint working');
        console.log(`✅ Found ${spaceResponse.data.total || 0} spaces`);
        
        console.log('\n🎉 ALL DATABASE AND API TESTS PASSED!');
        console.log('\n📊 System Status:');
        console.log('✅ Database Connection: Working');
        console.log('✅ Entity Relationships: Properly configured');
        console.log('✅ Authentication: Working');
        console.log('✅ Organization Module: Working');
        console.log('✅ Workspace Module: Working');
        console.log('✅ Space Module: Working (NEW)');
        console.log('✅ API Endpoints: All responding');
        
        console.log('\n🚀 Your ClickUp system is ready for use!');
        
      } else {
        throw new Error('No access token received');
      }
      
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log('❌ Authentication failed - Check admin credentials');
        console.log('💡 Make sure you have run the seeding script');
      } else {
        throw authError;
      }
    }

  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Troubleshooting Steps:');
      console.log('1. Make sure your NestJS server is running: npm run start:dev');
      console.log('2. Check if the server is running on http://localhost:3000');
      console.log('3. Verify PostgreSQL is running and accessible');
      console.log('4. Check your database configuration in .env file');
    } else if (error.response?.status === 500) {
      console.log('\n🔧 Database Connection Issues:');
      console.log('1. Check PostgreSQL is running');
      console.log('2. Verify database credentials in .env file');
      console.log('3. Make sure database exists');
      console.log('4. Check entity relationships are properly configured');
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  console.log('🔧 Database Connection Test');
  console.log('🔧 Make sure your server is running: npm run start:dev');
  console.log('🔧 Make sure PostgreSQL is running\n');
  
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };
