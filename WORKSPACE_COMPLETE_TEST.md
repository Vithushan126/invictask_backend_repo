# 🧪 **WORKSPACE MODULE - COMPLETE TEST GUIDE**

## 🎯 **Testing Your Complete ClickUp Workspace System**

This guide will help you test all workspace functionality to ensure everything works perfectly.

## 🚀 **Prerequisites**

1. **Database Running** - PostgreSQL with your connection
2. **Server Started** - `npm run start:dev`
3. **SUPER_ADMIN User** - Created through seeding
4. **Organization Created** - At least one organization exists

## 📋 **WORKSPACE API ENDPOINTS TO TEST**

### **1. Create Workspace**
```bash
POST http://localhost:3000/api/v1/workspaces?organizationId=YOUR_ORG_ID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Development Team",
  "description": "Main development workspace for our projects",
  "visibility": "private",
  "settings": {
    "allowGuestAccess": false,
    "defaultProjectVisibility": "private",
    "features": {
      "timeTracking": true,
      "customFields": true,
      "goals": true,
      "portfolios": true,
      "dashboards": true,
      "automations": true
    },
    "permissions": {
      "whoCanCreateProjects": "members",
      "whoCanInviteMembers": "admins",
      "whoCanDeleteTasks": "admins"
    },
    "notifications": {
      "emailDigest": true,
      "slackIntegration": false
    }
  }
}
```

### **2. Get My Workspaces**
```bash
GET http://localhost:3000/api/v1/workspaces/my-workspaces?page=1&limit=10&search=dev
Authorization: Bearer YOUR_JWT_TOKEN
```

### **3. Get Workspace Details**
```bash
GET http://localhost:3000/api/v1/workspaces/WORKSPACE_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### **4. Update Workspace**
```bash
PATCH http://localhost:3000/api/v1/workspaces/WORKSPACE_ID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Updated Development Team",
  "description": "Updated description",
  "settings": {
    "features": {
      "timeTracking": true,
      "customFields": true,
      "goals": false
    }
  }
}
```

### **5. Invite Member to Workspace**
```bash
POST http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/members/invite
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "email": "developer@example.com",
  "role": "member",
  "message": "Welcome to our development team!"
}
```

### **6. Get Workspace Members**
```bash
GET http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/members
Authorization: Bearer YOUR_JWT_TOKEN
```

### **7. Update Member Role**
```bash
PATCH http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/members/MEMBER_ID
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "role": "admin"
}
```

### **8. Get Workspace Statistics**
```bash
GET http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

### **9. Archive Workspace**
```bash
POST http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/archive
Authorization: Bearer YOUR_JWT_TOKEN
```

### **10. Restore Workspace**
```bash
POST http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/restore
Authorization: Bearer YOUR_JWT_TOKEN
```

### **11. Duplicate Workspace**
```bash
POST http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/duplicate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Development Team Copy",
  "includeMembers": true
}
```

### **12. Accept Workspace Invitation**
```bash
POST http://localhost:3000/api/v1/workspaces/invitations/accept
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "token": "INVITATION_TOKEN_FROM_EMAIL"
}
```

### **13. Leave Workspace**
```bash
POST http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/leave
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔧 **SUPER_ADMIN ENDPOINTS**

### **14. Get All Workspaces (SUPER_ADMIN)**
```bash
GET http://localhost:3000/api/v1/workspaces?page=1&limit=20&search=dev
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
```

### **15. Force Update Workspace (SUPER_ADMIN)**
```bash
PATCH http://localhost:3000/api/v1/workspaces/WORKSPACE_ID/force-update
Authorization: Bearer SUPER_ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "name": "Admin Updated Workspace",
  "isActive": false
}
```

## 🧪 **TESTING SCENARIOS**

### **Scenario 1: Complete Workspace Lifecycle**
1. Create organization (if not exists)
2. Create workspace in organization
3. Invite members to workspace
4. Update workspace settings
5. Create projects in workspace
6. Archive workspace
7. Restore workspace

### **Scenario 2: Member Management**
1. Invite member with "member" role
2. Member accepts invitation
3. Update member role to "admin"
4. Member creates project
5. Remove member from workspace

### **Scenario 3: Permission Testing**
1. Create workspace as admin
2. Invite member with limited permissions
3. Test member cannot perform admin actions
4. Test member can perform allowed actions

### **Scenario 4: Search and Filtering**
1. Create multiple workspaces
2. Test search functionality
3. Test filtering by visibility
4. Test pagination

## 🔍 **VALIDATION CHECKLIST**

### **✅ Core Functionality**
- [ ] Workspace creation with all fields
- [ ] Workspace retrieval with proper relations
- [ ] Workspace updates with validation
- [ ] Workspace deletion/archiving
- [ ] Member invitation system
- [ ] Role-based permissions
- [ ] Search and filtering
- [ ] Pagination support

### **✅ Security Features**
- [ ] JWT authentication required
- [ ] Role-based access control
- [ ] Organization membership validation
- [ ] Workspace membership validation
- [ ] SUPER_ADMIN privileges

### **✅ Data Integrity**
- [ ] Unique slug generation
- [ ] Proper foreign key relationships
- [ ] Cascade operations
- [ ] Transaction handling
- [ ] Error handling

### **✅ Notifications**
- [ ] Member invitation emails
- [ ] Role change notifications
- [ ] Workspace activity alerts
- [ ] System notifications

## 🐛 **COMMON ISSUES & FIXES**

### **Issue 1: "Organization not found"**
**Fix:** Ensure the organizationId in query parameter exists and user is a member

### **Issue 2: "Workspace slug already exists"**
**Fix:** Use a different name or provide a custom slug

### **Issue 3: "Insufficient permissions"**
**Fix:** Ensure user has the required role (admin for most operations)

### **Issue 4: "Member already exists"**
**Fix:** Check if user is already a member before inviting

### **Issue 5: "Invalid invitation token"**
**Fix:** Ensure token is valid and not expired

## 📊 **EXPECTED RESPONSES**

### **Successful Workspace Creation**
```json
{
  "id": "uuid",
  "name": "Development Team",
  "slug": "development-team",
  "description": "Main development workspace",
  "visibility": "private",
  "memberCount": 1,
  "projectCount": 0,
  "owner": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "organization": {
    "id": "uuid",
    "name": "Tech Company"
  },
  "settings": { ... },
  "isActive": true,
  "isArchived": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **Workspace Statistics**
```json
{
  "totalMembers": 5,
  "totalProjects": 3,
  "totalTasks": 25,
  "completedTasks": 15,
  "overdueTasks": 2,
  "activeMembers": 4,
  "recentActivity": [...]
}
```

## 🎯 **PERFORMANCE TESTING**

### **Load Testing**
1. Create 100 workspaces
2. Invite 50 members each
3. Test search performance
4. Test pagination efficiency

### **Concurrent Testing**
1. Multiple users creating workspaces simultaneously
2. Multiple invitations being sent
3. Concurrent member updates

## 🚀 **READY FOR PRODUCTION**

Once all tests pass, your workspace system includes:

✅ **Complete CRUD Operations**
✅ **Advanced Member Management**
✅ **Role-based Security**
✅ **Search & Filtering**
✅ **Invitation System**
✅ **Statistics & Analytics**
✅ **Archive/Restore Functionality**
✅ **SUPER_ADMIN Controls**
✅ **Notification Integration**
✅ **Error Handling**

**🎉 Your ClickUp workspace system is enterprise-ready! 🎉**
