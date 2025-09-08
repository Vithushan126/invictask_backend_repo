const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';

let authToken = '';
let organizationId = '';
let workspaceId = '';

// Test runner
async function runWorkspaceTests() {
  console.log('🚀 Starting Workspace Module Tests...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    await loginAsAdmin();
    console.log('✅ Admin login successful\n');

    // Step 2: Get or create organization
    console.log('2️⃣ Getting organization...');
    await getOrganization();
    console.log('✅ Organization retrieved\n');

    // Step 3: Create workspace
    console.log('3️⃣ Creating workspace...');
    await createWorkspace();
    console.log('✅ Workspace created successfully\n');

    // Step 4: Get workspace details
    console.log('4️⃣ Getting workspace details...');
    await getWorkspaceDetails();
    console.log('✅ Workspace details retrieved\n');

    // Step 5: Update workspace
    console.log('5️⃣ Updating workspace...');
    await updateWorkspace();
    console.log('✅ Workspace updated successfully\n');

    // Step 6: Get workspace statistics
    console.log('6️⃣ Getting workspace statistics...');
    await getWorkspaceStats();
    console.log('✅ Workspace statistics retrieved\n');

    // Step 7: Get my workspaces
    console.log('7️⃣ Getting my workspaces...');
    await getMyWorkspaces();
    console.log('✅ My workspaces retrieved\n');

    console.log('🎉 All workspace tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
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
  console.log('   Token received:', authToken.substring(0, 20) + '...');
}

async function getOrganization() {
  const response = await axios.get(`${BASE_URL}/organizations/my-organizations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.data.length > 0) {
    organizationId = response.data[0].id;
    console.log('   Organization ID:', organizationId);
  } else {
    throw new Error('No organizations found. Please create an organization first.');
  }
}

async function createWorkspace() {
  const workspaceData = {
    name: 'Test Workspace',
    description: 'A test workspace for API testing',
    visibility: 'private',
    settings: {
      allowGuestAccess: false,
      defaultProjectVisibility: 'private',
      features: {
        timeTracking: true,
        customFields: true,
        goals: true,
        portfolios: true,
        dashboards: true,
        automations: true
      },
      permissions: {
        whoCanCreateProjects: 'members',
        whoCanInviteMembers: 'admins',
        whoCanDeleteTasks: 'admins'
      },
      notifications: {
        emailDigest: true,
        slackIntegration: false
      }
    }
  };

  const response = await axios.post(
    `${BASE_URL}/workspaces?organizationId=${organizationId}`,
    workspaceData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  workspaceId = response.data.id;
  console.log('   Workspace created with ID:', workspaceId);
  console.log('   Workspace name:', response.data.name);
  console.log('   Workspace slug:', response.data.slug);
}

async function getWorkspaceDetails() {
  const response = await axios.get(`${BASE_URL}/workspaces/${workspaceId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   Workspace details:');
  console.log('   - Name:', response.data.name);
  console.log('   - Description:', response.data.description);
  console.log('   - Visibility:', response.data.visibility);
  console.log('   - Member count:', response.data.memberCount);
  console.log('   - Project count:', response.data.projectCount);
  console.log('   - Is active:', response.data.isActive);
  console.log('   - Is archived:', response.data.isArchived);
}

async function updateWorkspace() {
  const updateData = {
    name: 'Updated Test Workspace',
    description: 'Updated description for testing',
    settings: {
      features: {
        timeTracking: true,
        customFields: false,
        goals: true
      }
    }
  };

  const response = await axios.patch(
    `${BASE_URL}/workspaces/${workspaceId}`,
    updateData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('   Updated workspace name:', response.data.name);
  console.log('   Updated description:', response.data.description);
}

async function getWorkspaceStats() {
  const response = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/stats`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   Workspace statistics:');
  console.log('   - Total members:', response.data.totalMembers);
  console.log('   - Total projects:', response.data.totalProjects);
  console.log('   - Total tasks:', response.data.totalTasks);
  console.log('   - Completed tasks:', response.data.completedTasks);
  console.log('   - Active members:', response.data.activeMembers);
}

async function getMyWorkspaces() {
  const response = await axios.get(`${BASE_URL}/workspaces/my-workspaces?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   My workspaces:');
  console.log('   - Total workspaces:', response.data.total);
  console.log('   - Current page:', response.data.page);
  console.log('   - Workspaces in this page:', response.data.workspaces.length);
  
  response.data.workspaces.forEach((workspace, index) => {
    console.log(`   - Workspace ${index + 1}: ${workspace.name} (${workspace.visibility})`);
  });
}

// Run the tests
if (require.main === module) {
  runWorkspaceTests();
}

module.exports = { runWorkspaceTests };
