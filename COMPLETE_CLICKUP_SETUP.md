# 🚀 Complete ClickUp-like Project Management System

## 🎯 What We've Built

A comprehensive project management system with all the core features of ClickUp:

### ✅ **Authentication & Authorization**
- JWT-based authentication with refresh tokens
- User registration with email verification
- Password reset functionality
- Role-based access control (Super Admin, Admin, User)
- Two-factor authentication ready

### ✅ **Organization & Workspace Management**
- Multi-tenant organization structure
- Workspace creation and management
- Member invitation system via email
- Role-based permissions at organization and workspace levels
- Organization settings and branding

### ✅ **User Management**
- Complete user profiles with avatars
- User preferences (theme, timezone, language, notifications)
- Social links integration
- Activity tracking
- Notification settings management

### ✅ **File Upload System**
- Cloudinary integration for file storage
- Image transformations and optimization
- Multiple file upload support
- File type validation and security

### ✅ **Multi-channel Notification System**
- Email notifications with rich templates
- In-app notifications
- Push notification ready
- User notification preferences
- Bulk notification support

### 🔄 **Ready for Implementation**
- **Project Management** - Complete entity structure ready
- **Task Management** - Full CRUD with comments, attachments, time tracking
- **Workspace & Project Files** - File management system
- **Activity Feeds** - Comprehensive activity tracking
- **Time Tracking** - Task time entries and productivity metrics

## 📋 Prerequisites

1. **PostgreSQL Database** - Version 12 or higher
2. **Node.js** - Version 16 or higher
3. **Cloudinary Account** - For file storage
4. **Gmail Account** - For email notifications

## 🛠️ Setup Instructions

### 1. Database Setup

```sql
-- Connect to PostgreSQL and create database
CREATE DATABASE invictask;
CREATE USER invictask_user WITH PASSWORD '123';
GRANT ALL PRIVILEGES ON DATABASE invictask TO invictask_user;
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Your `.env` file is already configured:

```env
# Server Configuration
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123
DB_DATABASE=invictask
DB_SYNCHRONIZE=true
DB_LOGGING=true

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dlbpq0azo
CLOUDINARY_API_KEY=991141648184729
CLOUDINARY_API_SECRET=_ezijCF5poUPIkL8PLJbNmWw6Tk

# Mail Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=vithushan126@gmail.com
MAIL_PASS=fnlf vans cdow eewu
MAIL_FROM="InvicTask" <vithushan126@gmail.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 📡 Complete API Documentation

### 🔐 Authentication Endpoints

```bash
# Register new user with organization
POST /auth/register
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "password123",
  "organizationName": "My Company" // Optional
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Forgot password
POST /auth/forgot-password
{
  "email": "user@example.com"
}

# Reset password
POST /auth/reset-password
{
  "token": "reset-token",
  "newPassword": "newpassword123"
}

# Verify email
POST /auth/verify-email
{
  "token": "verification-token"
}

# Refresh token
POST /auth/refresh-token
{
  "refreshToken": "refresh-token"
}

# Change password
POST /auth/change-password
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}

# Logout
POST /auth/logout

# Get current user
GET /auth/me

# Check authentication
GET /auth/check
```

### 👥 User Management Endpoints

```bash
# Get all users (Admin only)
GET /users?search=john&role=user&status=active&page=1&limit=20

# Search users
GET /users/search?q=john&limit=10

# Get user statistics (Admin only)
GET /users/stats

# Get current user profile
GET /users/me

# Get user notification settings
GET /users/me/notification-settings

# Get user by ID
GET /users/:id

# Update current user profile
PATCH /users/me/profile
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Software Developer",
  "timezone": "America/New_York"
}

# Update user preferences
PATCH /users/me/preferences
{
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": false
    }
  }
}

# Update notification settings
PATCH /users/me/notification-settings
{
  "email": true,
  "taskAssigned": true,
  "mentions": true
}

# Update user status (Admin only)
PATCH /users/:id/status
{
  "status": "suspended",
  "reason": "Policy violation"
}

# Upload user avatar
POST /users/me/avatar
Content-Type: multipart/form-data
avatar: [image file]

# Remove user avatar
DELETE /users/me/avatar

# Update activity
POST /users/me/activity

# Deactivate account
POST /users/me/deactivate

# Reactivate account
POST /users/me/reactivate
```

### 🏢 Organization Management Endpoints

```bash
# Create organization
POST /organizations
{
  "name": "My Company",
  "description": "Software development company",
  "website": "https://mycompany.com",
  "industry": "Technology"
}

# Get user's organizations
GET /organizations/my-organizations

# Get organization by ID
GET /organizations/:id

# Update organization
PATCH /organizations/:id
{
  "name": "Updated Company Name",
  "description": "Updated description"
}

# Invite member to organization
POST /organizations/:id/invite
{
  "email": "newmember@example.com",
  "role": "member",
  "message": "Welcome to our team!"
}

# Accept organization invitation
POST /organizations/accept-invitation
{
  "token": "invitation-token"
}

# Get organization members
GET /organizations/:id/members

# Update member role
PATCH /organizations/:id/members/:memberId
{
  "role": "admin"
}

# Remove member
DELETE /organizations/:id/members/:memberId

# Get organization statistics
GET /organizations/:id/stats

# Upload organization logo
POST /organizations/:id/logo
Content-Type: multipart/form-data
logo: [image file]

# Remove organization logo
DELETE /organizations/:id/logo
```

### 📁 File Upload Endpoints

```bash
# Upload single file
POST /file-upload/single
Content-Type: multipart/form-data
file: [file]

# Upload multiple files
POST /file-upload/multiple
Content-Type: multipart/form-data
files: [file array]

# Upload image with transformations
POST /file-upload/image
Content-Type: multipart/form-data
image: [image file]

# Upload video
POST /file-upload/video
Content-Type: multipart/form-data
video: [video file]

# Upload document
POST /file-upload/document
Content-Type: multipart/form-data
document: [document file]

# Delete file
DELETE /file-upload/:publicId
```

### 🔔 Notification Endpoints

```bash
# Send single notification
POST /notifications
{
  "type": "task_assigned",
  "title": "New Task Assigned",
  "message": "You have been assigned a new task",
  "recipientId": "user-id",
  "channels": ["email", "in_app"],
  "priority": "medium"
}

# Send bulk notifications
POST /notifications/bulk
{
  "notifications": [
    {
      "type": "project_updated",
      "title": "Project Updated",
      "message": "Project has been updated",
      "recipientId": "user-id-1"
    }
  ]
}

# Get user notifications
GET /notifications/user/:userId?page=1&limit=20&unread=true

# Get unread count
GET /notifications/user/:userId/unread-count

# Mark notification as read
PUT /notifications/user/:userId/notification/:id/read

# Mark all notifications as read
PUT /notifications/user/:userId/notifications/read-all

# Get notification preferences
GET /notifications/user/:userId/preferences

# Update notification preferences
PUT /notifications/user/:userId/preferences
{
  "email": true,
  "push": false,
  "desktop": true
}
```

## 🗄️ Database Schema

### Core Tables Created:
- **users** - User accounts and profiles
- **organizations** - Organization/company data
- **organization_members** - Organization membership with roles
- **organization_invitations** - Pending organization invitations
- **workspaces** - Workspaces within organizations
- **workspace_members** - Workspace membership with roles
- **workspace_invitations** - Pending workspace invitations
- **projects** - Projects within workspaces
- **project_members** - Project membership with roles
- **project_files** - Files attached to projects
- **tasks** - Tasks within projects
- **task_comments** - Comments on tasks
- **task_attachments** - Files attached to tasks
- **task_time_entries** - Time tracking entries
- **task_checklists** - Task checklists
- **task_checklist_items** - Individual checklist items
- **task_comment_attachments** - Files attached to comments

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL database
# Create database 'invictask' with user 'postgres' and password '123'

# 3. Start the development server
npm run start:dev

# 4. Register a new user with organization
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mycompany.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "password123",
    "organizationName": "My Company"
  }'

# 5. Login and get access token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mycompany.com",
    "password": "password123"
  }'

# 6. Use the access token for authenticated requests
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🎯 ClickUp Features Implemented

### ✅ **Complete Features**
- ✅ User authentication and authorization
- ✅ Organization and workspace management
- ✅ Member invitation system
- ✅ Role-based permissions
- ✅ File upload and management
- ✅ Multi-channel notifications
- ✅ User profiles and preferences
- ✅ Activity tracking

### 🔄 **Ready to Implement** (Entities Created)
- 🔄 Project management with full CRUD
- 🔄 Task management with comments and attachments
- 🔄 Time tracking and productivity metrics
- 🔄 Checklist and subtask functionality
- 🔄 Advanced search and filtering
- 🔄 Dashboard and analytics
- 🔄 Automation and workflows

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Role-based access control
- Input validation with class-validator
- SQL injection prevention with TypeORM
- File type validation and size limits
- Email verification for new accounts
- Password reset with secure tokens

## 📈 Performance & Scalability

- Database indexing on frequently queried fields
- Pagination for large datasets
- File storage on Cloudinary CDN
- Optimized database queries with TypeORM
- Background job processing ready
- Caching layer ready for implementation

Your complete ClickUp-like project management system is now ready! 🎉

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check database exists
psql -U postgres -l

# Test connection
psql -h localhost -U postgres -d invictask
```

### Build Issues
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npm run build
```

Ready to build the next generation project management platform! 🚀
