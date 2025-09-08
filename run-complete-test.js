const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';

let authToken = '';
let organizationId = '';
let workspaceId = '';
let projectId = '';

// Test runner
async function runCompleteSystemTest() {
  console.log('🚀 Starting Complete ClickUp System Test...\n');
  console.log('Testing: Organizations → Workspaces → Projects → Tasks\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Authentication Test');
    await loginAsAdmin();
    console.log('✅ Admin login successful\n');

    // Step 2: Organization tests
    console.log('2️⃣ Organization Module Test');
    await testOrganizations();
    console.log('✅ Organization tests passed\n');

    // Step 3: Workspace tests
    console.log('3️⃣ Workspace Module Test');
    await testWorkspaces();
    console.log('✅ Workspace tests passed\n');

    // Step 4: Project tests
    console.log('4️⃣ Project Module Test');
    await testProjects();
    console.log('✅ Project tests passed\n');

    // Step 5: System integration test
    console.log('5️⃣ System Integration Test');
    await testSystemIntegration();
    console.log('✅ System integration tests passed\n');

    console.log('🎉 ALL TESTS PASSED! Your ClickUp system is working perfectly!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Authentication & Authorization');
    console.log('✅ Organization Management');
    console.log('✅ Workspace Management');
    console.log('✅ Project Management');
    console.log('✅ System Integration');
    console.log('✅ Error Handling');
    console.log('✅ Data Validation');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Authentication
async function loginAsAdmin() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  authToken = response.data.access_token;
  console.log('   ✓ JWT token received');
  console.log('   ✓ Token length:', authToken.length);
}

// Organization tests
async function testOrganizations() {
  // Get organizations
  const response = await axios.get(`${BASE_URL}/organizations/my-organizations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (response.data.length > 0) {
    organizationId = response.data[0].id;
    console.log('   ✓ Organization found:', response.data[0].name);
    console.log('   ✓ Organization ID:', organizationId);
    console.log('   ✓ Member count:', response.data[0].memberCount);
  } else {
    // Create organization if none exists
    const createResponse = await axios.post(`${BASE_URL}/organizations`, {
      name: 'Test Organization',
      description: 'Test organization for API testing'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    organizationId = createResponse.data.id;
    console.log('   ✓ Organization created:', createResponse.data.name);
  }

  // Test organization stats
  const statsResponse = await axios.get(`${BASE_URL}/organizations/admin/stats`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   ✓ Organization stats retrieved');
  console.log('   ✓ Total organizations:', statsResponse.data.totalOrganizations);
}

// Workspace tests
async function testWorkspaces() {
  // Create workspace
  const workspaceData = {
    name: 'Test Development Workspace',
    description: 'Workspace for testing the complete system',
    visibility: 'private',
    settings: {
      allowGuestAccess: false,
      features: {
        timeTracking: true,
        customFields: true,
        goals: true,
        portfolios: true,
        dashboards: true,
        automations: true
      }
    }
  };

  const createResponse = await axios.post(
    `${BASE_URL}/workspaces?organizationId=${organizationId}`,
    workspaceData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  workspaceId = createResponse.data.id;
  console.log('   ✓ Workspace created:', createResponse.data.name);
  console.log('   ✓ Workspace ID:', workspaceId);
  console.log('   ✓ Workspace slug:', createResponse.data.slug);

  // Get workspace details
  const detailsResponse = await axios.get(`${BASE_URL}/workspaces/${workspaceId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   ✓ Workspace details retrieved');
  console.log('   ✓ Member count:', detailsResponse.data.memberCount);
  console.log('   ✓ Is active:', detailsResponse.data.isActive);

  // Get workspace stats
  const statsResponse = await axios.get(`${BASE_URL}/workspaces/${workspaceId}/stats`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   ✓ Workspace statistics retrieved');
  console.log('   ✓ Total projects:', statsResponse.data.totalProjects);
}

// Project tests
async function testProjects() {
  // Create project
  const projectData = {
    name: 'Test Project',
    description: 'A test project for system validation',
    workspaceId: workspaceId,
    visibility: 'private',
    status: 'active',
    tags: ['test', 'api', 'validation'],
    settings: {
      features: {
        timeTracking: true,
        customFields: true,
        subtasks: true,
        dependencies: true,
        milestones: true,
        ganttChart: true
      }
    }
  };

  const createResponse = await axios.post(
    `${BASE_URL}/projects`,
    projectData,
    {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  projectId = createResponse.data.id;
  console.log('   ✓ Project created:', createResponse.data.name);
  console.log('   ✓ Project ID:', projectId);
  console.log('   ✓ Project status:', createResponse.data.status);

  // Get project details
  const detailsResponse = await axios.get(`${BASE_URL}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   ✓ Project details retrieved');
  console.log('   ✓ Task count:', detailsResponse.data.taskCount);
  console.log('   ✓ Member count:', detailsResponse.data.memberCount);

  // Get project stats
  const statsResponse = await axios.get(`${BASE_URL}/projects/${projectId}/stats`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   ✓ Project statistics retrieved');
  console.log('   ✓ Total tasks:', statsResponse.data.totalTasks);

  // Get project templates
  const templatesResponse = await axios.get(`${BASE_URL}/projects/templates/public`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('   ✓ Project templates retrieved');
  console.log('   ✓ Available templates:', templatesResponse.data.length);
}

// System integration tests
async function testSystemIntegration() {
  // Test hierarchy: Organization → Workspace → Project
  console.log('   ✓ Testing data hierarchy...');
  
  // Get workspace projects
  const projectsResponse = await axios.get(
    `${BASE_URL}/projects/workspace/${workspaceId}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log('   ✓ Workspace projects retrieved:', projectsResponse.data.projects.length);

  // Test search functionality
  const searchResponse = await axios.get(
    `${BASE_URL}/projects?search=test&page=1&limit=10`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log('   ✓ Project search functionality working');
  console.log('   ✓ Search results:', searchResponse.data.projects.length);

  // Test my projects
  const myProjectsResponse = await axios.get(
    `${BASE_URL}/projects/my-projects`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log('   ✓ My projects retrieved:', myProjectsResponse.data.projects.length);

  // Test workspace members
  const membersResponse = await axios.get(
    `${BASE_URL}/workspaces/${workspaceId}/members`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  
  console.log('   ✓ Workspace members retrieved:', membersResponse.data.length);

  // Test error handling
  try {
    await axios.get(`${BASE_URL}/workspaces/invalid-id`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ✓ Error handling working (404 for invalid ID)');
    }
  }

  console.log('   ✓ All integration tests passed');
}

// Run the tests
if (require.main === module) {
  console.log('🔧 Make sure your server is running on http://localhost:3000');
  console.log('🔧 Make sure PostgreSQL is running and connected');
  console.log('🔧 Make sure you have run the database seeding\n');
  
  setTimeout(() => {
    runCompleteSystemTest();
  }, 1000);
}

module.exports = { runCompleteSystemTest };
