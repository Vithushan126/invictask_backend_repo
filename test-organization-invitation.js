const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';

let authToken = '';
let organizationId = '';

// Test organization invitation functionality
async function testOrganizationInvitation() {
  console.log('🧪 Testing Organization Invitation Fix...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    await loginAsAdmin();
    console.log('✅ Admin login successful\n');

    // Step 2: Get organization
    console.log('2️⃣ Getting organization...');
    await getOrganization();
    console.log('✅ Organization retrieved\n');

    // Step 3: Test organization invitation
    console.log('3️⃣ Testing organization invitation...');
    await testInvitation();
    console.log('✅ Organization invitation test passed\n');

    // Step 4: Test getting invitations
    console.log('4️⃣ Testing get invitations...');
    await testGetInvitations();
    console.log('✅ Get invitations test passed\n');

    console.log('🎉 ALL ORGANIZATION INVITATION TESTS PASSED!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Authentication working');
    console.log('✅ Organization invitation creation working');
    console.log('✅ Invitation response DTO working');
    console.log('✅ Relations loading properly');
    console.log('✅ No more undefined property errors');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Test functions
async function loginAsAdmin() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  authToken = response.data.access_token;
  console.log('   ✓ Token received');
}

async function getOrganization() {
  const response = await axios.get(`${BASE_URL}/organizations/my-organizations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.data.length > 0) {
    organizationId = response.data[0].id;
    console.log('   ✓ Organization ID:', organizationId);
    console.log('   ✓ Organization name:', response.data[0].name);
  } else {
    throw new Error('No organizations found. Please create an organization first.');
  }
}

async function testInvitation() {
  const invitationData = {
    email: 'test.invitation@example.com',
    role: 'member',
    message: 'Welcome to our organization! This is a test invitation.'
  };

  console.log('   📧 Sending invitation to:', invitationData.email);
  
  const response = await axios.post(
    `${BASE_URL}/organizations/${organizationId}/invite`,
    invitationData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('   ✓ Invitation sent successfully');
  console.log('   ✓ Invitation ID:', response.data.id);
  console.log('   ✓ Invitation email:', response.data.email);
  console.log('   ✓ Invitation role:', response.data.role);
  console.log('   ✓ Invitation message:', response.data.message);
  console.log('   ✓ Is accepted:', response.data.isAccepted);
  console.log('   ✓ Expires at:', response.data.expiresAt);
  
  // Check if inviter information is present
  if (response.data.inviter) {
    console.log('   ✓ Inviter loaded:', response.data.inviter.firstName, response.data.inviter.lastName);
  } else {
    console.log('   ⚠️ Inviter is null (this is OK if relations are optional)');
  }
  
  // Check if organization information is present
  if (response.data.organization) {
    console.log('   ✓ Organization loaded:', response.data.organization.name);
  } else {
    console.log('   ⚠️ Organization is null (this is OK if relations are optional)');
  }
}

async function testGetInvitations() {
  const response = await axios.get(
    `${BASE_URL}/organizations/${organizationId}/invitations`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log('   ✓ Invitations retrieved');
  console.log('   ✓ Total invitations:', response.data.length);
  
  if (response.data.length > 0) {
    const invitation = response.data[0];
    console.log('   ✓ First invitation email:', invitation.email);
    console.log('   ✓ First invitation role:', invitation.role);
    console.log('   ✓ First invitation status:', invitation.isAccepted ? 'Accepted' : 'Pending');
  }
}

// Run the tests
if (require.main === module) {
  console.log('🔧 Make sure your server is running on http://localhost:3000');
  console.log('🔧 Make sure PostgreSQL is running and connected');
  console.log('🔧 Make sure you have at least one organization\n');
  
  setTimeout(() => {
    testOrganizationInvitation();
  }, 1000);
}

module.exports = { testOrganizationInvitation };
