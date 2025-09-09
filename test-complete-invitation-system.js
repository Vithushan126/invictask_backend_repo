const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = '';
let organizationId = '';
let userId = '';
let testUserId = '';

// Test data
const testAdmin = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  password: 'admin123',
  displayName: 'Admin User'
};

const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'testuser@example.com',
  password: 'test123',
  displayName: 'Test User'
};

async function runCompleteInvitationTest() {
  console.log('🚀 Starting Complete ClickUp-Style Invitation System Test\n');

  try {
    // Step 1: Setup test environment
    await setupTestEnvironment();
    
    // Step 2: Test External Email Invitations
    await testExternalEmailInvitations();
    
    // Step 3: Test Multiple Email Invitations
    await testMultipleEmailInvitations();
    
    // Step 4: Test Internal User Invitations
    await testInternalUserInvitations();
    
    // Step 5: Test Invitation Acceptance
    await testInvitationAcceptance();
    
    // Step 6: Test Invitation Decline
    await testInvitationDecline();
    
    console.log('\n🎉 All invitation system tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function setupTestEnvironment() {
  console.log('📋 Setting up test environment...');
  
  // Register admin user
  try {
    await axios.post(`${BASE_URL}/auth/register`, testAdmin);
    console.log('   ✓ Admin user registered');
  } catch (error) {
    if (error.response?.status !== 409) throw error;
    console.log('   ✓ Admin user already exists');
  }
  
  // Register test user for internal invitations
  try {
    await axios.post(`${BASE_URL}/auth/register`, testUser);
    console.log('   ✓ Test user registered');
  } catch (error) {
    if (error.response?.status !== 409) throw error;
    console.log('   ✓ Test user already exists');
  }
  
  // Login as admin
  const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: testAdmin.email,
    password: testAdmin.password
  });
  
  authToken = loginResponse.data.access_token;
  userId = loginResponse.data.user.id;
  console.log('   ✓ Admin logged in successfully');
  
  // Get test user ID
  const testUserLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: testUser.email,
    password: testUser.password
  });
  testUserId = testUserLoginResponse.data.user.id;
  console.log('   ✓ Test user ID obtained');
  
  // Create organization
  try {
    const orgResponse = await axios.post(`${BASE_URL}/organizations`, {
      name: 'Test Organization',
      description: 'Organization for testing invitation system'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    organizationId = orgResponse.data.id;
    console.log('   ✓ Test organization created');
  } catch (error) {
    if (error.response?.status === 409) {
      // Get existing organization
      const orgsResponse = await axios.get(`${BASE_URL}/organizations`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      organizationId = orgsResponse.data[0]?.id;
      console.log('   ✓ Using existing organization');
    } else {
      throw error;
    }
  }
  
  console.log('   📋 Test environment ready\n');
}

async function testExternalEmailInvitations() {
  console.log('📧 Testing External Email Invitations...');
  
  const invitationData = {
    email: 'external.user@example.com',
    role: 'member',
    message: 'Welcome to our team! We are excited to have you join us.'
  };
  
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
  
  console.log('   ✅ External invitation sent successfully');
  console.log('   ✓ Invitation ID:', response.data.id);
  console.log('   ✓ Invitation email:', response.data.email);
  console.log('   ✓ Invitation role:', response.data.role);
  console.log('   ✓ Invitation expires:', response.data.expiresAt);
  console.log('');
}

async function testMultipleEmailInvitations() {
  console.log('📧📧📧 Testing Multiple Email Invitations...');
  
  const invitationData = {
    emails: [
      'team.member1@example.com',
      'team.member2@example.com',
      'team.member3@example.com',
      'invalid-email', // Test invalid email
      'team.member1@example.com' // Test duplicate
    ],
    role: 'member',
    message: 'Welcome to our organization! You have been invited to join our team and start collaborating on exciting projects.'
  };
  
  console.log(`   📧 Sending multiple invitations to ${invitationData.emails.length} emails...`);
  
  const response = await axios.post(
    `${BASE_URL}/organizations/${organizationId}/invite-multiple`,
    invitationData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('   ✅ Multiple invitations processed successfully');
  console.log('   ✅ Response message:', response.data.message);
  
  // Log summary
  if (response.data.summary) {
    console.log('   📊 Invitation Summary:');
    console.log(`   ✓ Total emails processed: ${response.data.summary.total}`);
    console.log(`   ✓ Successful invitations: ${response.data.summary.successful}`);
    console.log(`   ✓ Failed invitations: ${response.data.summary.failed}`);
    
    if (response.data.summary.errors.length > 0) {
      console.log('   ⚠️ Errors encountered:');
      response.data.summary.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }
  }
  
  // Log successful invitations
  console.log('   📧 Successful Invitations:');
  response.data.invitations.forEach((invitation, index) => {
    console.log(`   ✓ ${index + 1}. ${invitation.email} (${invitation.role}) - ID: ${invitation.id}`);
  });
  console.log('');
}

async function testInternalUserInvitations() {
  console.log('👤 Testing Internal User Invitations...');
  
  const invitationData = {
    userId: testUserId,
    role: 'member',
    message: 'We would like to invite you to join our organization. You will have access to all our projects and can collaborate with the team.'
  };
  
  console.log(`   📨 Sending internal invitation to user ID: ${testUserId}...`);
  
  const response = await axios.post(
    `${BASE_URL}/organizations/${organizationId}/invite-internal`,
    invitationData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('   ✅ Internal invitation sent successfully');
  console.log('   ✓ Invitation ID:', response.data.id);
  console.log('   ✓ Target user ID:', response.data.userId);
  console.log('   ✓ Invitation role:', response.data.role);
  console.log('   ✓ Invitation status:', response.data.status);
  console.log('   ✓ Inviter:', response.data.inviter?.firstName, response.data.inviter?.lastName);
  console.log('   ✓ Organization:', response.data.organization?.name);
  console.log('');
  
  // Store invitation ID for acceptance test
  global.internalInvitationId = response.data.id;
}

async function testInvitationAcceptance() {
  console.log('✅ Testing Invitation Acceptance...');
  
  // Test external invitation acceptance with account creation
  console.log('   🆕 Testing signup + accept in one step...');
  
  // First create an external invitation to test with
  const externalInvite = await axios.post(
    `${BASE_URL}/organizations/${organizationId}/invite`,
    {
      email: 'newuser@example.com',
      role: 'member',
      message: 'Welcome! Please create your account.'
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  // Test accept with account creation
  const acceptResponse = await axios.post(
    `${BASE_URL}/organizations/accept-invitation-with-account`,
    {
      token: externalInvite.data.token,
      firstName: 'New',
      lastName: 'User',
      email: 'newuser@example.com',
      password: 'newuser123',
      displayName: 'New User'
    }
  );
  
  console.log('   ✅ External invitation accepted with account creation');
  console.log('   ✓ Success:', acceptResponse.data.success);
  console.log('   ✓ Message:', acceptResponse.data.message);
  console.log('   ✓ New user:', acceptResponse.data.user?.firstName, acceptResponse.data.user?.lastName);
  console.log('   ✓ Organization:', acceptResponse.data.organization?.name);
  console.log('   ✓ Role:', acceptResponse.data.membership?.role);
  
  // Test internal invitation acceptance
  if (global.internalInvitationId) {
    console.log('   👤 Testing internal invitation acceptance...');
    
    // Login as test user to accept internal invitation
    const testUserLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    const testUserToken = testUserLoginResponse.data.access_token;
    
    const internalAcceptResponse = await axios.post(
      `${BASE_URL}/organizations/internal-invitations/${global.internalInvitationId}/accept`,
      {},
      {
        headers: { Authorization: `Bearer ${testUserToken}` }
      }
    );
    
    console.log('   ✅ Internal invitation accepted successfully');
    console.log('   ✓ Success:', internalAcceptResponse.data.success);
    console.log('   ✓ Message:', internalAcceptResponse.data.message);
    console.log('   ✓ User:', internalAcceptResponse.data.user?.firstName, internalAcceptResponse.data.user?.lastName);
    console.log('   ✓ Organization:', internalAcceptResponse.data.organization?.name);
    console.log('   ✓ Role:', internalAcceptResponse.data.membership?.role);
  }
  
  console.log('');
}

async function testInvitationDecline() {
  console.log('❌ Testing Invitation Decline...');
  
  // Create another internal invitation to test decline
  const invitationData = {
    userId: testUserId,
    role: 'member',
    message: 'Another invitation for testing decline functionality.'
  };
  
  // First create a new test user for decline test
  const declineTestUser = {
    firstName: 'Decline',
    lastName: 'Test',
    email: 'decline.test@example.com',
    password: 'decline123',
    displayName: 'Decline Test'
  };
  
  try {
    await axios.post(`${BASE_URL}/auth/register`, declineTestUser);
  } catch (error) {
    if (error.response?.status !== 409) throw error;
  }
  
  const declineUserLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
    email: declineTestUser.email,
    password: declineTestUser.password
  });
  
  const declineUserId = declineUserLoginResponse.data.user.id;
  const declineUserToken = declineUserLoginResponse.data.access_token;
  
  // Send internal invitation to decline test user
  const inviteResponse = await axios.post(
    `${BASE_URL}/organizations/${organizationId}/invite-internal`,
    {
      userId: declineUserId,
      role: 'member',
      message: 'This invitation will be declined for testing.'
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log('   📨 Internal invitation created for decline test');
  
  // Decline the invitation
  const declineResponse = await axios.post(
    `${BASE_URL}/organizations/internal-invitations/${inviteResponse.data.id}/decline`,
    {
      reason: 'Thank you for the invitation, but I am not available to join at this time.'
    },
    {
      headers: { Authorization: `Bearer ${declineUserToken}` }
    }
  );
  
  console.log('   ✅ Internal invitation declined successfully');
  console.log('   ✓ Message:', declineResponse.data.message);
  console.log('');
}

// Run the test
runCompleteInvitationTest();
