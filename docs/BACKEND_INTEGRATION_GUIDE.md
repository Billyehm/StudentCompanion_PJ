# Backend Integration Guide

## Data Structures

### User Object
```javascript
{
  id: "std_1234567890" | "lec_1234567890",
  name: "John Doe",
  email: "john@university.edu",
  password: "hashed_password", // Should be hashed with bcrypt
  regNumber: "STU2024001", // Only for students, null for lecturers
  role: "student" | "lecturer",
  createdAt: "2024-04-04T10:30:00.000Z"
}
```

### QR Session Object
```javascript
{
  id: "qr_1234567890",
  courseCode: "CS101",
  courseTitle: "Introduction to Programming",
  createdBy: "Dr. James Smith",
  createdByEmail: "james.smith@university.edu",
  createdAt: "2024-04-04T10:00:00.000Z",
  expiresAt: "2024-04-04T10:30:00.000Z",
  durationMinutes: 30,
  isActive: true,
  qrData: '{"sessionId":"qr_123...","courseCode":"CS101","courseTitle":"..."}' // JSON string
}
```

### Attendance Record Object
```javascript
{
  id: "att_1234567890",
  userId: "std_1111111",
  userName: "John Doe",
  regNumber: "STU2024001",
  sessionId: "qr_1234567890",
  className: "Introduction to Programming",
  courseCode: "CS101",
  timestamp: "2024-04-04T10:15:30.000Z",
  scannedAt: "4/4/2024, 10:15:30 AM"
}
```

## Required API Endpoints

### Authentication
```
POST /api/auth/register
  Body: { name, email, regNumber, password }
  Returns: { success, user, error }

POST /api/auth/login
  Body: { email, password }
  Returns: { success, user, token, error }

POST /api/auth/logout
  Returns: { success }
```

### User Management
```
GET /api/users/students
  Returns: [{ id, name, email, regNumber }]

GET /api/users/lecturers
  Returns: [{ id, name, email }]

GET /api/users/:userId
  Returns: { id, name, email, role, ... }
```

### QR Code Sessions
```
POST /api/qr-sessions
  Body: { courseCode, courseTitle, durationMinutes }
  Returns: { success, session }

GET /api/qr-sessions/my-sessions
  Returns: [{ id, courseCode, courseTitle, ... }]

GET /api/qr-sessions/:sessionId
  Returns: { id, courseCode, ... }

POST /api/qr-sessions/:sessionId/close
  Returns: { success }
```

### Attendance
```
POST /api/attendance/record
  Body: { 
    userId, 
    userName, 
    regNumber, 
    sessionId, 
    className, 
    courseCode 
  }
  Returns: { success, record, error }

GET /api/attendance/sessions/:sessionId
  Returns: [{ id, userId, userName, scannedAt, ... }]

GET /api/attendance/my-attendance
  Returns: [{ sessionId, courseCode, scannedAt, ... }]

GET /api/attendance/sessions/:sessionId/export
  Returns: Excel file with attendance data
```

## Database Schema (Recommended)

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  reg_number VARCHAR(50) UNIQUE,
  role ENUM('student', 'lecturer') NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_reg_number (reg_number)
);
```

### QR Sessions Table
```sql
CREATE TABLE qr_sessions (
  id VARCHAR(50) PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  created_by_id VARCHAR(50) NOT NULL,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  duration_minutes INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  qr_data JSON NOT NULL,
  
  FOREIGN KEY (created_by_id) REFERENCES users(id),
  INDEX idx_created_by_id (created_by_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active (is_active)
);
```

### Attendance Records Table
```sql
CREATE TABLE attendance_records (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  reg_number VARCHAR(50) NOT NULL,
  session_id VARCHAR(50) NOT NULL,
  class_name VARCHAR(255) NOT NULL,
  course_code VARCHAR(20) NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES qr_sessions(id),
  UNIQUE KEY unique_scan (user_id, session_id),
  INDEX idx_session_id (session_id),
  INDEX idx_scanned_at (scanned_at)
);
```

## Frontend to Backend Migration

### Current localStorage Keys
- `users` → Migrate to database
- `qr_sessions` → Migrate to database
- `attendance_records` → Migrate to database
- `currentUser` → Use JWT tokens instead
- `userRole` → Included in JWT payload

### Migration Steps
1. Create API endpoints for all current functionality
2. Update auth.js to use API calls instead of localStorage
3. Replace localStorage operations with API calls
4. Implement JWT token management
5. Add error handling for network failures
6. Implement offline mode with sync on reconnect

### Code Migration Example

**Current (localStorage):**
```javascript
AUTH.login(email, password) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  localStorage.setItem('currentUser', JSON.stringify(session));
}
```

**Updated (API):**
```javascript
async AUTH.login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
  }
  return data;
}
```

## Security Recommendations for Backend

1. **Password Security**
   - Use bcrypt with salt rounds 12
   - Never store plain text passwords

2. **Session Management**
   - Use JWT with appropriate expiration (15-30 minutes)
   - Refresh tokens for longer sessions
   - Store tokens in httpOnly cookies

3. **CORS**
   - Configure appropriate CORS headers
   - Whitelist frontend domain

4. **Input Validation**
   - Validate all inputs on server
   - Sanitize database queries
   - Prevent SQL injection

5. **Rate Limiting**
   - Limit login attempts
   - Rate limit API endpoints
   - Prevent brute force attacks

6. **Data Protection**
   - Encrypt sensitive data
   - Use HTTPS only
   - Implement CSRF protection

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_BASE_URL=https://api.example.com
REACT_APP_API_TIMEOUT=30000
```

### Backend (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=companion_db
JWT_SECRET=your-secret-key
JWT_EXPIRY=30m
```

## Development Timeline

1. **Phase 1** - API endpoints creation (1-2 weeks)
2. **Phase 2** - Frontend integration (1-2 weeks)
3. **Phase 3** - Testing & debugging (1 week)
4. **Phase 4** - Deployment & security hardening (1 week)

---

**Note:** The current system uses localStorage for demonstration. This document provides a complete roadmap for production deployment with a proper backend.
