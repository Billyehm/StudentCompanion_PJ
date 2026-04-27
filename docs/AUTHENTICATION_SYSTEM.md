# Authentication & Role-Based Access Control System

## Overview
A complete frontend-based authentication system with role-based access control for Students and Lecturers has been implemented.

## Architecture

### Core Authentication (`js/auth.js`)
- Central authentication management system
- Stores user data in localStorage
- Manages login/logout, registration, and session handling

### User Roles
1. **STUDENTS** - Can register publicly
   - Scan QR codes for attendance
   - View attendance history
   - Browse directory
   - Access academic tools

2. **LECTURERS** - Hardcoded accounts (admin-only)
   - Generate QR codes for attendance sessions
   - View student attendance records
   - Download attendance as Excel
   - Browse directory

## Features Implemented

### 1. Authentication System
- **Student Registration** (`pages/register.html`)
  - Name, Registration Number, Email, Password
  - Email and registration number uniqueness checks
  - Password confirmation validation
  
- **User Login** (`pages/login.html`)
  - Single login for both students and lecturers
  - Demo lecturer credentials displayed for testing
  - Role-based redirect to appropriate dashboard

- **Logout**
  - Available on all authenticated pages
  - Profile panel with logout button

### 2. Role-Based Dashboards

#### Student Dashboard (`pages/dashboard.html`)
- Welcome message with student name and registration number
- Quick stats: attendance count, assigned courses
- Quick action cards:
  - Scan Attendance
  - View Directory
  - Medical Panel
  - Results/CGPA
  - AI Assistant

#### Lecturer Dashboard (`pages/dashboard.html`)
- Welcome message with lecturer name
- Quick stats: active QR sessions, total attendance records, classes managed
- Quick action cards:
  - Generate QR Code
  - View Attendance Records
  - Directory
  - Medical Resources
  - AI Assistant

### 3. Attendance Management

#### Student Attendance Scanning (`pages/attendance.html`)
- **Real QR Scanner** using jsQR library
  - Requests camera access
  - Scans QR codes in real-time
  - Decodes session data from QR
  - Records attendance with timestamp

- **Features:**
  - Live camera feed with QR overlay
  - Automatic session validity checking
  - Duplicate scan prevention (one scan per student per session)
  - Scanning history display
  - Demo/test mode for systems without camera access
  - Success/error notifications

#### Lecturer QR Code Generator (`pages/lecturer-qr.html`)
- Create new QR sessions with:
  - Course Code
  - Course Title
  - Duration (in minutes)
  
- **Features:**
  - Generates scannable QR code
  - Real-time countdown display
  - Shows current scan count
  - Lists all active sessions
  - Session expiration tracking
  - Quick link to view attendance for each session

#### Lecture Attendance Records (`pages/lecturer-attendance.html`)
- View all attendance records from their QR sessions
- **Features:**
  - Filter by session selector
  - Search by registration number or student name
  - Display: student name, reg number, course, scanned time
  - **Download as Excel** using xlsx library
  - Total records counter
  - Shows attendance count per session

### 4. Directory System

#### Unified Directory (`pages/directory.html`)
- **Tab-based Interface:**
  - Students tab
  - Lecturers tab

- **Features for Students Tab:**
  - List all registered students
  - Display: Name, Registration Number, Email
  - Real-time search by name or registration number

- **Features for Lecturers Tab:**
  - List all lecturers
  - Display: Name, Email
  - Real-time search by name or email

- **Search Functionality:**
  - Case-insensitive
  - Search updates both tabs independently
  - Shows count of filtered results

### 5. Security & Access Control

#### Route Protection
- `AUTH.protectRoute()` - Checks if user is logged in
- `AUTH.protectRoute('student')` - Only for students
- `AUTH.protectRoute('lecturer')` - Only for lecturers
- Auto-redirect to login if not authenticated
- Auto-redirect to appropriate dashboard if accessing wrong role's features

#### Navigation Based on Role
- Student menu: Scan Attendance, Directory, Results, Medical, AI Assistant
- Lecturer menu: Generate QR, View Attendance, Directory, Medical, AI Assistant
- Dynamic menu generation based on user role

### 6. Data Management

#### Storage (localStorage)
- **Users:** All registered users with roles
- **Attendance Records:** Student attendance scans for each QR session
- **QR Sessions:** Created QR codes by lecturers

#### Hardcoded Lecturer Accounts (for demo)
```
1. Dr. James Smith | james.smith@university.edu | Password: Lecturer123!
2. Prof. Maria Garcia | maria.garcia@university.edu | Password: Lecturer123!
3. Dr. David Lee | david.lee@university.edu | Password: Lecturer123!
```

## File Structure

### New/Modified Files
```
js/
  ├── auth.js                      [NEW] Core authentication system
  ├── login.js                     [UPDATED] Role-based login
  ├── register.js                  [UPDATED] Student registration only
  ├── dashboard.js                 [UPDATED] Role-specific dashboards
  ├── attendance.js                [UPDATED] QR code scanning
  ├── directory.js                 [UPDATED] Tab-based directory
  ├── lecturer-qr.js               [NEW] QR code generation
  ├── lecturer-attendance.js        [NEW] Attendance records viewing
  └── shared.js                    [UPDATED] Shared utilities

pages/
  ├── login.html                   [UPDATED] Unified login
  ├── register.html                [UPDATED] Student registration
  ├── dashboard.html               [UPDATED] Role-based dashboards
  ├── attendance.html              [UPDATED] QR scanner
  ├── directory.html               [UPDATED] Tab-based directory
  ├── lecturer-qr.html             [NEW] QR generator
  ├── lecturer-attendance.html      [NEW] Attendance records
  └── index.html                   [UPDATED] Auto-redirect if logged in

css/
  └── style.css                    [Uses existing styling]
```

### External Libraries Used
- **jsQR** (1.4.0) - QR code decoding from camera feed
- **XLSX** (0.18.5) - Excel file generation for attendance export

## Usage Flow

### Student Workflow
1. **Registration** → Create account with reg number
2. **Login** → Enter credentials
3. **Dashboard** → View stats and quick actions
4. **Scan Attendance** → Point camera at lecturer's QR code
5. **View Directory** → Find student/lecturer contacts

### Lecturer Workflow
1. **Login** → Use a hardcoded account
2. **Dashboard** → View statistics
3. **Generate QR** → Create attendance session with duration
4. **Show to Students** → Students scan the QR code
5. **View Attendance** → Check who scanned and download records

## Security Considerations (Frontend Implementation)

### Current Limitations
- All data stored in localStorage (not secure for production)
- No password hashing
- No server-side validation
- No session tokens/JWT

### For Production Deployment
- Implement proper backend API
- Use hashed passwords
- Implement JWT/session tokens
- Database for persistent storage
- HTTPS for data in transit
- Input validation on server
- Rate limiting on API endpoints

## Testing

### Demo Credentials
**Students:** Create new account during registration
**Lecturers:** 
- Email: james.smith@university.edu
- Password: Lecturer123!

### Test Scenarios
1. **Registration & Login** - Create account and login as student
2. **QR Generation** - Login as lecturer, generate QR code
3. **QR Scanning** - Use student account to scan generated code
4. **Attendance Records** - View records as lecturer, download as Excel
5. **Directory Search** - Search for students/lecturers by name
6. **Role-Based Access** - Try accessing lecturer features as student (should redirect)

## Notes

- All features are frontend-only using localStorage
- QR codes encode session data in JSON format
- Attendance records include timestamp for each scan
- Excel export includes: Name, Reg Number, Course, Time
- Navigation automatically updates based on user role
- Mobile-friendly interface with responsive design

---

**Last Updated:** April 4, 2026
**Status:** Core features implemented and tested
**Next Steps:** Backend API integration for production deployment
