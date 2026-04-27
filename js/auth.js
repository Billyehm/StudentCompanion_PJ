/**
 * Authentication & Authorization System
 * Handles user login, registration, role-based access, and data persistence
 */

const AUTH = {
  getSupabaseConfig() {
    const config = window.SUPABASE_CONFIG || {};
    return {
      url: String(config.url || '').trim(),
      anonKey: String(config.anonKey || '').trim()
    };
  },

  SESSION_STORAGE_KEY: 'supabase_session',

  hasSupabaseConfig() {
    const { url, anonKey } = this.getSupabaseConfig();
    return Boolean(url && anonKey);
  },

  normalizeName(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  },

  getFirstName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return 'User';
    }
    return parts[0];
  },

  buildDisplayName({ surname = '', firstName = '', otherName = '' } = {}) {
    return this.normalizeName([firstName, otherName, surname].filter(Boolean).join(' '));
  },

  normalizeRegNumber(regNumber) {
    return String(regNumber || '').trim().toUpperCase();
  },

  getStoredSession() {
    const raw = localStorage.getItem(this.SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  },

  saveSession(session) {
    if (session) {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  },

  getAccessToken() {
    const session = this.getStoredSession();
    return session ? session.access_token : '';
  },

  async refreshSession() {
    const stored = this.getStoredSession();
    if (!stored || !stored.refresh_token) {
      throw new Error('No refresh token available.');
    }

    const { url, anonKey } = this.getSupabaseConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase is not configured yet.');
    }

    const headers = {
      apikey: anonKey,
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refresh_token: stored.refresh_token })
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text || null;
    }

    if (!response.ok) {
      const message = (data && (data.msg || data.error_description || data.message)) || 'Failed to refresh session.';
      throw new Error(message);
    }

    // Supabase returns a session object on refresh
    const session = data;
    this.saveSession(session);
    try {
      await this.refreshCurrentUserFromDb();
    } catch (_) {
      // ignore user refresh errors here
    }
    return session;
  },

  clearLegacyLocalData() {
    [
      '_auth_initialized',
      'users',
      'student_profiles',
      'lecturer_profiles',
      'studentCompanionCourses'
    ].forEach((key) => localStorage.removeItem(key));
  },

  async authRequest(path, options = {}) {
    const { url, anonKey } = this.getSupabaseConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase is not configured yet.');
    }

    const sessionToken = this.getAccessToken();
    const headers = {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(options.useSession !== false && sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(options.headers || {})
    };

    let response = await fetch(`${url}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text || null;
    }

    if (!response.ok) {
      // Try refresh once when unauthorized and using session
      if ((response.status === 401 || (data && /jwt expired|invalid token/i.test(String(data.message || data || '')))) && options.useSession !== false) {
        try {
          await this.refreshSession();
          // rebuild headers with new token
          const newToken = this.getAccessToken();
          const retryHeaders = Object.assign({}, headers, newToken ? { Authorization: `Bearer ${newToken}` } : {});
          response = await fetch(`${url}${path}`, {
            method: options.method || 'GET',
            headers: retryHeaders,
            body: options.body ? JSON.stringify(options.body) : undefined
          });

          const retryText = await response.text();
          try { data = retryText ? JSON.parse(retryText) : null; } catch (_) { data = retryText || null; }
        } catch (err) {
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const message = data && data.msg
          ? data.msg
          : data && data.error_description
            ? data.error_description
            : data && data.message
              ? data.message
              : 'Supabase request failed.';
        throw new Error(message);
      }
    }

    return data;
  },

  async restRequest(path, options = {}) {
    const { url, anonKey } = this.getSupabaseConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase is not configured yet.');
    }

    const sessionToken = this.getAccessToken();
    const headers = {
      apikey: anonKey,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(options.headers || {})
    };

    let response = await fetch(`${url}/rest/v1/${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text || null;
    }

    if (!response.ok) {
      // Try refresh once when unauthorized
      if ((response.status === 401 || (data && /jwt expired|invalid token/i.test(String(data.message || data || '')))) && this.getAccessToken()) {
        try {
          await this.refreshSession();
          const newToken = this.getAccessToken();
          const retryHeaders = Object.assign({}, headers, newToken ? { Authorization: `Bearer ${newToken}` } : {});
          response = await fetch(`${url}/rest/v1/${path}`, {
            method: options.method || 'GET',
            headers: retryHeaders,
            body: options.body ? JSON.stringify(options.body) : undefined
          });

          text = await response.text();
          try { data = text ? JSON.parse(text) : null; } catch (_) { data = text || null; }
        } catch (err) {
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const message = data && data.message ? data.message : 'Database request failed.';
        throw new Error(message);
      }
    }

    return data;
  },

  async invokeFunction(name, payload, options = {}) {
    const { url, anonKey } = this.getSupabaseConfig();
    if (!url || !anonKey) {
      throw new Error('Supabase is not configured yet.');
    }

    const sessionToken = this.getAccessToken();
    const headers = {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(options.headers || {})
    };

    let response = await fetch(`${url}/functions/v1/${name}`, {
      method: options.method || 'POST',
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });

    let text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text || null;
    }

    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && sessionToken) {
        try {
          await this.refreshSession();
          const nextToken = this.getAccessToken();
          response = await fetch(`${url}/functions/v1/${name}`, {
            method: options.method || 'POST',
            headers: {
              ...headers,
              ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {})
            },
            body: payload === undefined ? undefined : JSON.stringify(payload)
          });

          text = await response.text();
          try {
            data = text ? JSON.parse(text) : null;
          } catch (_) {
            data = text || null;
          }
        } catch (_) {
          this.logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const message = data && typeof data === 'object'
          ? data.error || data.message || 'Function request failed.'
          : String(data || 'Function request failed.');
        throw new Error(message);
      }
    }

    return data;
  },

  mapProfile(profile) {
    if (!profile) return null;
    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      firstName: this.getFirstName(profile.name),
      role: profile.role,
      isCourseRep: Boolean(profile.is_course_rep),
      regNumber: profile.reg_number || null,
      faculty: profile.faculty || null,
      department: profile.department || null,
      level: profile.level || null,
      title: profile.title || null,
      academicLocked: Boolean(profile.academic_locked),
      nameChangedAt: profile.name_changed_at || null,
      emailChangedAt: profile.email_changed_at || null,
      passwordChangedAt: profile.password_changed_at || null,
      createdAt: profile.created_at || null
    };
  },

  async fetchProfileById(userId) {
    const rows = await this.restRequest(`profiles?id=eq.${encodeURIComponent(userId)}&select=*`);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  },

  async refreshCurrentUserFromDb() {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.userId) {
      return null;
    }

    const profile = await this.fetchProfileById(currentUser.userId);
    if (!profile) {
      return null;
    }

    const mapped = this.mapProfile(profile);
    localStorage.setItem('currentUser', JSON.stringify(mapped));
    this.clearLegacyLocalData();
    return mapped;
  },

  async registerStudentDb(name, email, regNumber, password) {
    const normalizedName = this.normalizeName(name);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRegNumber = this.normalizeRegNumber(regNumber);

    const signupResult = await this.authRequest('/auth/v1/signup', {
      method: 'POST',
      useSession: false,
      body: {
        email: normalizedEmail,
        password,
        data: {
          name: normalizedName,
          role: 'student',
          reg_number: normalizedRegNumber
        }
      }
    });

    const session = signupResult && signupResult.session ? signupResult.session : null;
    const user = signupResult && signupResult.user ? signupResult.user : null;

    if (session) {
      this.saveSession(session);
      await this.restRequest('profiles', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: {
          id: user.id,
          email: normalizedEmail,
          name: normalizedName,
          role: 'student',
          is_course_rep: false,
          reg_number: normalizedRegNumber
        }
      });

      const mapped = await this.refreshCurrentUserFromDb();
      return { success: true, user: mapped, requiresEmailConfirmation: false };
    }

    return {
      success: true,
      requiresEmailConfirmation: true,
      message: 'Account created. Complete email confirmation before logging in.'
    };
  },

  async loginDb(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const session = await this.authRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      useSession: false,
      body: {
        email: normalizedEmail,
        password
      }
    });

    this.saveSession(session);
    const profile = await this.fetchProfileById(session.user.id);

    if (!profile) {
      throw new Error('Profile record not found for this account. Create the tables from docs/SUPABASE_SETUP.md first.');
    }

    const mapped = this.mapProfile(profile);
    localStorage.setItem('currentUser', JSON.stringify(mapped));
    this.clearLegacyLocalData();
    return { success: true, user: mapped };
  },

  async saveAcademicProfileDb(payload) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to update your profile.');
    }

    const body = {
      faculty: payload.faculty,
      department: payload.department,
      level: payload.level,
      title: payload.title || null,
      academic_locked: true
    };

    const nextName = this.normalizeName(payload.name || '');
    const currentName = this.normalizeName(currentUser.name || '');
    if (nextName && nextName !== currentName) {
      if (currentUser.role !== 'lecturer') {
        throw new Error('Only lecturers can update their name here.');
      }
      if (currentUser.nameChangedAt) {
        throw new Error('You have already used your one-time lecturer name change.');
      }
      body.name = nextName;
      body.name_changed_at = new Date().toISOString();
    }

    const rows = await this.restRequest(`profiles?id=eq.${encodeURIComponent(currentUser.userId)}`, {
      method: 'PATCH',
      body
    });

    const updatedProfile = Array.isArray(rows) && rows.length ? rows[0] : await this.fetchProfileById(currentUser.userId);
    const mapped = this.mapProfile(updatedProfile);
    localStorage.setItem('currentUser', JSON.stringify(mapped));
    return mapped;
  },

  isAcademicProfileComplete(user = null) {
    const targetUser = user || this.getCurrentUser();
    if (!targetUser) {
      return false;
    }

    if (targetUser.role === 'lecturer') {
      return Boolean(targetUser.faculty && targetUser.department && targetUser.title);
    }

    return Boolean(targetUser.faculty && targetUser.department && targetUser.level);
  },

  getProfileCompletionMessage(context = 'this page') {
    return `Complete your academic profile before accessing ${context}.`;
  },

  async getDirectoryDataDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view the directory.');
    }

    if (!this.isAcademicProfileComplete(currentUser)) {
      return {
        students: [],
        lecturers: [],
        context: {
          faculty: currentUser.faculty || '',
          department: currentUser.department || '',
          level: currentUser.level || ''
        },
        filterConfigured: false,
        profileComplete: false,
        audienceMode: currentUser.role === 'lecturer' ? 'department' : 'class',
        message: this.getProfileCompletionMessage('the directory')
      };
    }

    const rows = await this.restRequest('profiles?select=id,name,email,role,is_course_rep,reg_number,faculty,department,level,title&order=name.asc');
    const filterConfigured = Boolean(currentUser.faculty && currentUser.department);
    const shouldFilterStudentsByLevel = currentUser.role !== 'lecturer';

    const students = rows.filter((row) => row.role === 'student').filter((student) => {
      if (!filterConfigured) return true;
      const facultyMatch = student.faculty === currentUser.faculty;
      const departmentMatch = student.department === currentUser.department;
      const levelMatch = !shouldFilterStudentsByLevel || !currentUser.level || !student.level || student.level === currentUser.level;
      return facultyMatch && departmentMatch && levelMatch;
    });

    const lecturers = rows.filter((row) => row.role === 'lecturer').filter((lecturer) => {
      if (!filterConfigured) return true;
      return lecturer.faculty === currentUser.faculty && lecturer.department === currentUser.department;
    });

    return {
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        regNumber: student.reg_number || '',
        faculty: student.faculty || '',
        department: student.department || '',
        level: student.level || ''
      })),
      lecturers: lecturers.map((lecturer) => ({
        id: lecturer.id,
        name: lecturer.name,
        email: lecturer.email,
        faculty: lecturer.faculty || '',
        department: lecturer.department || '',
        level: lecturer.level || '',
        title: lecturer.title || ''
      })),
      context: {
        faculty: currentUser.faculty || '',
        department: currentUser.department || '',
        level: currentUser.level || ''
      },
      filterConfigured,
      profileComplete: true,
      audienceMode: shouldFilterStudentsByLevel ? 'class' : 'department'
    };
  },

  async getMyAnnouncementsDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view announcement history.');
    }

    if (!(currentUser.role === 'lecturer' || currentUser.isCourseRep)) {
      throw new Error('Only course reps or lecturers can view sent announcements.');
    }

    const rows = await this.restRequest(
      `announcements?created_by_user_id=eq.${encodeURIComponent(currentUser.userId)}&select=id,course_code,text,type,created_by_name,created_by_user_id,created_at,expires_at,audience_faculty,audience_department,audience_level,audience_user_id,audience_user_name,message_scope&order=created_at.desc`
    );

    return (Array.isArray(rows) ? rows : []).map((row) => this.mapAnnouncementRow(row));
  },

  mapAnnouncementRow(row) {
    return {
      id: row.id,
      courseCode: row.course_code || '',
      text: row.text || '',
      type: row.type || 'general',
      createdAt: row.created_at || null,
      createdBy: row.created_by_name || '',
      createdByUserId: row.created_by_user_id || '',
      expiresAt: row.expires_at || null,
      audienceFaculty: row.audience_faculty || '',
      audienceDepartment: row.audience_department || '',
      audienceLevel: row.audience_level || '',
      audienceUserId: row.audience_user_id || '',
      audienceUserName: row.audience_user_name || '',
      messageScope: row.message_scope || 'broadcast'
    };
  },

  canReceiveAnnouncement(user, announcement) {
    if (!user || !announcement) {
      return false;
    }

    if (!this.isAcademicProfileComplete(user)) {
      return false;
    }

    if (announcement.audienceUserId) {
      return announcement.audienceUserId === user.userId;
    }

    const facultyMatch = !announcement.audienceFaculty || announcement.audienceFaculty === user.faculty;
    const departmentMatch = !announcement.audienceDepartment || announcement.audienceDepartment === user.department;
    const levelMatch = !announcement.audienceLevel || announcement.audienceLevel === user.level;
    return facultyMatch && departmentMatch && levelMatch;
  },

  async getAnnouncementsDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view announcements.');
    }

    if (currentUser.role === 'lecturer') {
      return [];
    }

    if (!this.isAcademicProfileComplete(currentUser)) {
      throw new Error(this.getProfileCompletionMessage('announcements'));
    }

    const rows = await this.restRequest('announcements?select=id,course_code,text,type,created_by_name,created_by_user_id,created_at,expires_at,audience_faculty,audience_department,audience_level,audience_user_id,audience_user_name,message_scope&order=created_at.desc');
    return (Array.isArray(rows) ? rows : [])
      .map((row) => this.mapAnnouncementRow(row))
      .filter((row) => this.canReceiveAnnouncement(currentUser, row));
  },

  async createAnnouncementDb(payload) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to send announcements.');
    }

    if (!(this.isCourseRep() || currentUser.role === 'lecturer')) {
      throw new Error('Only course reps or lecturers can send announcements.');
    }

    if (!this.isAcademicProfileComplete(currentUser)) {
      throw new Error(this.getProfileCompletionMessage('the announcement page'));
    }

    const body = {
      course_code: String(payload.courseCode || '').trim().toUpperCase() || 'GENERAL',
      text: String(payload.text || '').trim(),
      type: String(payload.type || 'general').trim(),
      created_by_name: currentUser.name,
      created_by_user_id: currentUser.userId,
      expires_at: payload.expiresAt,
      audience_faculty: payload.audienceUserId ? null : currentUser.faculty,
      audience_department: payload.audienceUserId ? null : currentUser.department,
      audience_level: payload.audienceUserId ? null : (this.isCourseRep() ? currentUser.level : null),
      audience_user_id: payload.audienceUserId || null,
      audience_user_name: payload.audienceUserName || null,
      message_scope: payload.audienceUserId ? 'direct' : 'broadcast'
    };

    if (!body.text || !body.expires_at) {
      throw new Error('Message and expiry are required.');
    }

    if (payload.audienceUserId && currentUser.role !== 'lecturer') {
      throw new Error('Only lecturers can send direct student messages.');
    }

    const rows = await this.restRequest('announcements', {
      method: 'POST',
      prefer: 'return=minimal',
      body
    });

    if (Array.isArray(rows) && rows.length) {
      return this.mapAnnouncementRow(rows[0]);
    }

    return {
      id: '',
      courseCode: body.course_code,
      text: body.text,
      type: body.type,
      createdAt: new Date().toISOString(),
      createdBy: body.created_by_name,
      createdByUserId: body.created_by_user_id,
      expiresAt: body.expires_at,
      audienceFaculty: body.audience_faculty || '',
      audienceDepartment: body.audience_department || '',
      audienceLevel: body.audience_level || '',
      audienceUserId: body.audience_user_id || '',
      audienceUserName: body.audience_user_name || '',
      messageScope: body.message_scope || 'broadcast'
    };
  },

  async sendDirectStudentMessageDb(payload) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to send a direct message.');
    }

    if (currentUser.role !== 'lecturer') {
      throw new Error('Only lecturers can send direct student messages.');
    }

    if (!payload || !payload.studentId || !payload.studentName) {
      throw new Error('Student target is required.');
    }

    const text = String(payload.text || '').trim();
    if (!text) {
      throw new Error('Message text is required.');
    }

    const expiresAt = payload.expiresAt || new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();
    return this.createAnnouncementDb({
      courseCode: payload.courseCode || 'DIRECT',
      type: payload.type || 'direct-message',
      text,
      expiresAt,
      audienceUserId: payload.studentId,
      audienceUserName: payload.studentName
    });
  },

  mapTimetableRow(row) {
    return {
      id: row.id,
      createdByUserId: row.created_by_user_id || '',
      audienceFaculty: row.audience_faculty || '',
      audienceDepartment: row.audience_department || '',
      audienceLevel: row.audience_level || '',
      dayOfWeek: row.day_of_week || '',
      startTime: row.start_time || '',
      endTime: row.end_time || '',
      courseCode: row.course_code || '',
      courseTitle: row.course_title || '',
      venue: row.venue || '',
      lecturerName: row.lecturer_name || '',
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    };
  },

  canReceiveTimetable(user, timetable) {
    if (!user || !timetable) {
      return false;
    }

    if (!this.isAcademicProfileComplete(user)) {
      return false;
    }

    const facultyMatch = !timetable.audienceFaculty || timetable.audienceFaculty === user.faculty;
    const departmentMatch = !timetable.audienceDepartment || timetable.audienceDepartment === user.department;
    const levelMatch = !timetable.audienceLevel || timetable.audienceLevel === user.level;
    return facultyMatch && departmentMatch && levelMatch;
  },

  async getTimetablesDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view timetables.');
    }

    const rows = await this.restRequest('timetables?select=id,created_by_user_id,audience_faculty,audience_department,audience_level,day_of_week,start_time,end_time,course_code,course_title,venue,lecturer_name,created_at,updated_at&order=day_of_week,start_time');
    return (Array.isArray(rows) ? rows : [])
      .map((row) => this.mapTimetableRow(row))
      .filter((row) => this.canReceiveTimetable(currentUser, row));
  },

  async createTimetableEntryDb(payload) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to create timetable entries.');
    }

    if (!(this.isCourseRep() || currentUser.role === 'lecturer')) {
      throw new Error('Only course reps or lecturers can create timetable entries.');
    }

    if (!this.isAcademicProfileComplete(currentUser)) {
      throw new Error(this.getProfileCompletionMessage('the timetable page'));
    }

    const body = {
      created_by_user_id: currentUser.userId,
      audience_faculty: currentUser.faculty,
      audience_department: currentUser.department,
      audience_level: this.isCourseRep() ? currentUser.level : null,
      day_of_week: String(payload.dayOfWeek || '').trim(),
      start_time: payload.startTime,
      end_time: payload.endTime,
      course_code: String(payload.courseCode || '').trim().toUpperCase(),
      course_title: String(payload.courseTitle || '').trim(),
      venue: String(payload.venue || '').trim(),
      lecturer_name: String(payload.lecturerName || '').trim()
    };

    if (!body.day_of_week || !body.start_time || !body.end_time || !body.course_code || !body.course_title) {
      throw new Error('Day, time, course code, and course title are required.');
    }

    const rows = await this.restRequest('timetables', {
      method: 'POST',
      body
    });

    return Array.isArray(rows) && rows.length ? this.mapTimetableRow(rows[0]) : null;
  },

  async updateTimetableEntryDb(id, payload) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to update timetable entries.');
    }

    if (!(this.isCourseRep() || currentUser.role === 'lecturer')) {
      throw new Error('Only course reps or lecturers can update timetable entries.');
    }

    const body = {
      day_of_week: String(payload.dayOfWeek || '').trim(),
      start_time: payload.startTime,
      end_time: payload.endTime,
      course_code: String(payload.courseCode || '').trim().toUpperCase(),
      course_title: String(payload.courseTitle || '').trim(),
      venue: String(payload.venue || '').trim(),
      lecturer_name: String(payload.lecturerName || '').trim()
    };

    if (!body.day_of_week || !body.start_time || !body.end_time || !body.course_code || !body.course_title) {
      throw new Error('Day, time, course code, and course title are required.');
    }

    const rows = await this.restRequest(`timetables?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });

    return Array.isArray(rows) && rows.length ? this.mapTimetableRow(rows[0]) : null;
  },

  async deleteTimetableEntryDb(id) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to delete timetable entries.');
    }

    if (!(this.isCourseRep() || currentUser.role === 'lecturer')) {
      throw new Error('Only course reps or lecturers can delete timetable entries.');
    }

    await this.restRequest(`timetables?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });

    return true;
  },

  getCooldownStatus(changedAt, fallbackCreatedAt, days) {
    const baseDate = changedAt || fallbackCreatedAt || new Date().toISOString();
    const baseMs = new Date(baseDate).getTime();
    const cooldownMs = days * 24 * 60 * 60 * 1000;
    const remainingMs = baseMs + cooldownMs - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

    return {
      allowed: remainingMs <= 0,
      daysRemaining
    };
  },

  async getSecurityStatus() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view security settings.');
    }

    return {
      email: this.getCooldownStatus(currentUser.emailChangedAt, currentUser.createdAt, 180),
      password: this.getCooldownStatus(currentUser.passwordChangedAt, currentUser.createdAt, 30)
    };
  },

  async updateEmailInDb(nextEmail) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to update your email.');
    }

    const policy = await this.getSecurityStatus();
    if (!policy.email.allowed) {
      throw new Error(`You can change your email again in ${policy.email.daysRemaining} day(s).`);
    }

    const email = String(nextEmail || '').trim().toLowerCase();
    await this.authRequest('/auth/v1/user', {
      method: 'PUT',
      body: { email }
    });

    const rows = await this.restRequest(`profiles?id=eq.${encodeURIComponent(currentUser.userId)}`, {
      method: 'PATCH',
      body: {
        email,
        email_changed_at: new Date().toISOString()
      }
    });

    const updatedProfile = Array.isArray(rows) && rows.length ? rows[0] : await this.fetchProfileById(currentUser.userId);
    const mapped = this.mapProfile(updatedProfile);
    localStorage.setItem('currentUser', JSON.stringify(mapped));
    return mapped;
  },

  async updatePasswordInDb(nextPassword) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to update your password.');
    }

    const policy = await this.getSecurityStatus();
    if (!policy.password.allowed) {
      throw new Error(`You can change your password again in ${policy.password.daysRemaining} day(s).`);
    }

    await this.authRequest('/auth/v1/user', {
      method: 'PUT',
      body: { password: String(nextPassword || '').trim() }
    });

    await this.restRequest(`profiles?id=eq.${encodeURIComponent(currentUser.userId)}`, {
      method: 'PATCH',
      body: {
        password_changed_at: new Date().toISOString()
      }
    });

    return true;
  },

  normalizeResultRow(row) {
    const course = row.course || row.courses || row.course_info || {};
    return {
      result_id: row.id || '',
      course_id: row.course_id || course.id || '',
      course_code: course.course_code || course.code || row.course_code || row.code || '',
      course_title: course.course_title || course.title || course.name || row.course_title || row.title || '',
      units: Number(
        course.units
        ?? course.credit_unit
        ?? course.credit_units
        ?? course.unit_load
        ?? row.units
        ?? row.credit_unit
        ?? row.credit_units
        ?? row.unit_load
        ?? 0
      ),
      grade: row.grade || row.letter_grade || row.score_grade || '',
      grade_point: Number(row.grade_point ?? row.point ?? row.gp ?? row.gradePoint ?? 0),
      semester: row.semester || row.term || row.semester_name || '',
      session_label: row.session_label || row.session || row.academic_session || '',
      published_at: row.published_at || row.created_at || null
    };
  },

  getDepartmentCoursePrefixes(department) {
    const prefixMap = {
      'Computer Science': ['CSC', 'CYB', 'DTS', 'GST'],
      'Information Technology': ['IFT', 'GST'],
      'Software Engineering': ['SEN', 'CSC', 'GST'],
      Mathematics: ['MTH', 'GST'],
      Statistics: ['STA', 'MTH', 'GST'],
      Physics: ['PHY', 'GST'],
      Chemistry: ['CHM', 'GST'],
      Biology: ['BIO', 'GST'],
      'Electrical Engineering': ['EEE', 'GST'],
      'Mechanical Engineering': ['MEE', 'GST'],
      'Civil Engineering': ['CVE', 'GST'],
      'Chemical Engineering': ['CHE', 'GST'],
      Economics: ['ECO', 'GST'],
      Accounting: ['ACC', 'GST'],
      'Business Administration': ['BUS', 'GST'],
      'Political Science': ['POS', 'GST'],
      'Mass Communication': ['MAC', 'GST'],
      English: ['ENG', 'GST'],
      History: ['HIS', 'GST'],
      'Theatre Arts': ['THA', 'GST'],
      Linguistics: ['LIN', 'GST'],
      'Educational Management': ['EDM', 'GST'],
      'Guidance and Counselling': ['GCE', 'GST'],
      'Science Education': ['SED', 'GST'],
      Law: ['LAW', 'GST'],
      Medicine: ['MED', 'GST'],
      Nursing: ['NUR', 'GST'],
      'Medical Laboratory Science': ['MLS', 'GST']
    };

    return prefixMap[department] || ['GST'];
  },

  courseMatchesDepartment(courseCode, department) {
    const prefixes = this.getDepartmentCoursePrefixes(department);
    const normalizedCode = String(courseCode || '').trim().toUpperCase();
    return prefixes.some((prefix) => normalizedCode.startsWith(`${prefix} `) || normalizedCode.startsWith(prefix));
  },

  async getCoursesForCurrentUserDb(options = {}) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view courses.');
    }

    if (!currentUser.department) {
      throw new Error('Complete your academic profile before loading courses.');
    }

    const rows = await this.restRequest('courses?select=id,course_code,course_title,units,level,semester&order=course_code.asc');
    const allCourses = Array.isArray(rows) ? rows : [];
    const includeAllLevels = Boolean(options.includeAllLevels);

    return allCourses.filter((course) => {
      const departmentMatch = this.courseMatchesDepartment(course.course_code, currentUser.department);
      const levelMatch = includeAllLevels || currentUser.role === 'lecturer'
        ? true
        : !currentUser.level || !course.level || course.level === currentUser.level;
      return departmentMatch && levelMatch;
    });
  },

  mergeCourseSheet(classCourses, resultRows) {
    const resultByCourseId = new Map();
    const resultByCode = new Map();

    resultRows.forEach((row) => {
      if (row.course_id) {
        resultByCourseId.set(row.course_id, row);
      }
      if (row.course_code) {
        resultByCode.set(String(row.course_code).toUpperCase(), row);
      }
    });

    const merged = classCourses.map((course) => {
      const matched = resultByCourseId.get(course.id) || resultByCode.get(String(course.course_code || '').toUpperCase()) || null;
      return {
        course_id: course.id || '',
        course_code: course.course_code || '',
        course_title: course.course_title || '',
        units: Number(course.units || 0),
        level: course.level || '',
        semester: matched ? matched.semester || course.semester || '' : course.semester || '',
        session_label: matched ? matched.session_label || '' : '',
        grade: matched ? matched.grade || '' : '',
        grade_point: matched ? Number(matched.grade_point || 0) : null,
        published_at: matched ? matched.published_at || null : null,
        hasPublishedGrade: Boolean(matched && matched.grade)
      };
    });

    resultRows.forEach((row) => {
      const alreadyIncluded = merged.some((course) => {
        return (row.course_id && course.course_id === row.course_id) || (row.course_code && course.course_code === row.course_code);
      });

      if (!alreadyIncluded) {
        merged.push({
          ...row,
          hasPublishedGrade: Boolean(row.grade)
        });
      }
    });

    return merged;
  },

  async getStudentResultsDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view results.');
    }

    const rows = await this.restRequest(
      `results?student_id=eq.${encodeURIComponent(currentUser.userId)}&select=id,student_id,course_id,grade,grade_point,semester,session_label,published_at,created_at,course:courses(id,course_code,course_title,units)&order=session_label.desc.nullslast,semester.asc.nullslast,created_at.desc.nullslast`
    );

    return (Array.isArray(rows) ? rows : [])
      .map((row) => this.normalizeResultRow(row))
      .filter((row) => row.course_id && (row.course_code || row.course_title));
  },

  async getStudentResultSheetDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view results.');
    }

    if (!this.isAcademicProfileComplete(currentUser)) {
      throw new Error('Complete your academic profile before accessing results.');
    }

    const [resultRows, courseRows] = await Promise.all([
      this.getStudentResultsDb(),
      this.getCoursesForCurrentUserDb({ includeAllLevels: true })
    ]);

    const filteredCourses = (Array.isArray(courseRows) ? courseRows : []).filter((course) => {
      return this.courseMatchesDepartment(course.course_code, currentUser.department);
    });

    return this.mergeCourseSheet(filteredCourses, resultRows);
  },

  async getDashboardSummaryDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view the dashboard.');
    }

    if (currentUser.role === 'student') {
      const [attendanceRows, resultRows] = await Promise.all([
        this.restRequest(`attendance_records?student_id=eq.${encodeURIComponent(currentUser.userId)}&select=id`),
        this.getStudentResultsDb()
      ]);

      return {
        user: currentUser,
        attendanceCount: Array.isArray(attendanceRows) ? attendanceRows.length : 0,
        courseCount: Array.isArray(resultRows) ? resultRows.length : 0
      };
    }

    const sessions = await this.restRequest(`qr_sessions?created_by_user_id=eq.${encodeURIComponent(currentUser.userId)}&select=id,expires_at,is_active`);
    const activeSessionIds = (Array.isArray(sessions) ? sessions : []).filter((session) => {
      return session.is_active && new Date(session.expires_at).getTime() > Date.now();
    }).map((session) => session.id);

    let attendanceRows = [];
    if (activeSessionIds.length || (Array.isArray(sessions) && sessions.length)) {
      attendanceRows = await this.restRequest(`attendance_records?lecturer_id=eq.${encodeURIComponent(currentUser.userId)}&select=id`);
    }

    return {
      user: currentUser,
      activeSessions: activeSessionIds.length,
      totalAttendance: Array.isArray(attendanceRows) ? attendanceRows.length : 0,
      classCount: Array.isArray(sessions) ? sessions.length : 0
    };
  },

  mapQrSessionRow(row, attendanceCount = 0) {
    const expiresAt = row.expires_at || null;
    const expiresAtMs = new Date(expiresAt || 0).getTime();
    const isExpired = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
    const isDeactivated = !Boolean(row.is_active);

    return {
      id: row.id,
      createdByUserId: row.created_by_user_id || '',
      courseCode: row.course_code || '',
      courseTitle: row.course_title || '',
      durationMinutes: Number(row.duration_minutes || 0),
      geofenceLatitude: row.geofence_latitude == null ? null : Number(row.geofence_latitude),
      geofenceLongitude: row.geofence_longitude == null ? null : Number(row.geofence_longitude),
      geofenceRadiusMeters: Number(row.geofence_radius_meters || 0),
      expiresAt,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
      isExpired,
      isDeactivated,
      isActive: !isDeactivated && !isExpired,
      attendanceCount: Number(attendanceCount || 0),
      qrData: JSON.stringify({
        sessionId: row.id,
        lecturerId: row.created_by_user_id || '',
        courseCode: row.course_code || '',
        courseTitle: row.course_title || '',
        geofenceLatitude: row.geofence_latitude == null ? null : Number(row.geofence_latitude),
        geofenceLongitude: row.geofence_longitude == null ? null : Number(row.geofence_longitude),
        geofenceRadiusMeters: Number(row.geofence_radius_meters || 0),
        expiresAt
      })
    };
  },

  mapAttendanceRecordRow(row, studentProfile = null) {
    const scannedAt = row.scanned_at || row.created_at || null;
    return {
      id: row.id,
      sessionId: row.session_id || '',
      studentId: row.student_id || '',
      lecturerId: row.lecturer_id || '',
      courseCode: row.course_code || '',
      className: row.course_title || '',
      courseTitle: row.course_title || '',
      scannedAt,
      scannedAtDisplay: scannedAt ? new Date(scannedAt).toLocaleString() : '',
      locationVerified: Boolean(row.location_verified),
      scanLatitude: row.scan_latitude == null ? null : Number(row.scan_latitude),
      scanLongitude: row.scan_longitude == null ? null : Number(row.scan_longitude),
      scanAccuracyMeters: row.scan_accuracy_meters == null ? null : Number(row.scan_accuracy_meters),
      geoDistanceMeters: row.geo_distance_meters == null ? null : Number(row.geo_distance_meters),
      geofenceRadiusMeters: row.geofence_radius_meters == null ? null : Number(row.geofence_radius_meters),
      withinGeofence: typeof row.within_geofence === 'boolean' ? row.within_geofence : null,
      deviceToken: String(row.device_token || ''),
      deviceLabel: String(row.device_label || ''),
      userName: studentProfile ? studentProfile.name || '' : '',
      regNumber: studentProfile ? studentProfile.reg_number || '' : '',
      isFlagged: false,
      flagReasons: [],
      integrityLabel: 'Legit'
    };
  },

  roundMetric(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return null;
    }
    const factor = 10 ** digits;
    return Math.round(number * factor) / factor;
  },

  calculateDistanceMeters(fromLatitude, fromLongitude, toLatitude, toLongitude) {
    const lat1 = Number(fromLatitude);
    const lon1 = Number(fromLongitude);
    const lat2 = Number(toLatitude);
    const lon2 = Number(toLongitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
      return null;
    }

    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  },

  buildAttendanceIntegrity(record, devicePeerMap = new Map()) {
    const flagReasons = [];

    if (!record.locationVerified) {
      flagReasons.push('Location could not be verified during scan.');
    } else if (record.withinGeofence === false) {
      const distance = this.roundMetric(record.geoDistanceMeters, 1);
      const radius = this.roundMetric(record.geofenceRadiusMeters, 1);
      flagReasons.push(`Outside geofence: ${distance == null ? 'unknown' : `${distance}m`} from class location${radius == null ? '' : ` (allowed ${radius}m)`}.`);
    }

    const devicePeers = devicePeerMap.get(`${record.sessionId}::${record.deviceToken}`) || [];
    if (record.deviceToken && devicePeers.length > 1) {
      const peerNames = devicePeers
        .filter((peer) => peer.studentId !== record.studentId)
        .map((peer) => peer.userName || peer.regNumber || peer.studentId)
        .filter(Boolean);

      if (peerNames.length) {
        flagReasons.push(`Same device token reused for multiple student accounts in this session: ${peerNames.join(', ')}.`);
      }
    }

    return {
      ...record,
      isFlagged: flagReasons.length > 0,
      flagReasons,
      integrityLabel: flagReasons.length ? 'Flagged' : 'Legit'
    };
  },

  async createQRSessionDb(courseCode, courseTitle, durationMinutes, options = {}) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to create QR sessions.');
    }

    if (currentUser.role !== 'lecturer') {
      throw new Error('Only lecturers can create QR sessions.');
    }

    const normalizedCode = String(courseCode || '').trim().toUpperCase();
    const normalizedTitle = String(courseTitle || '').trim();
    const normalizedDuration = Number(durationMinutes || 0);
    const geofenceLatitude = Number(options.geofenceLatitude);
    const geofenceLongitude = Number(options.geofenceLongitude);
    const geofenceRadiusMeters = Number(options.geofenceRadiusMeters || 120);

    if (!normalizedCode || !normalizedTitle || !Number.isFinite(normalizedDuration) || normalizedDuration <= 0) {
      throw new Error('Course code, title, and duration are required.');
    }

    if (!Number.isFinite(geofenceLatitude) || !Number.isFinite(geofenceLongitude)) {
      throw new Error('Capture your current location before generating the QR session.');
    }

    if (!Number.isFinite(geofenceRadiusMeters) || geofenceRadiusMeters <= 0) {
      throw new Error('Enter a valid geofence radius.');
    }

    const expiresAt = new Date(Date.now() + normalizedDuration * 60000).toISOString();
    const rows = await this.restRequest('qr_sessions', {
      method: 'POST',
      body: {
        created_by_user_id: currentUser.userId,
        course_code: normalizedCode,
        course_title: normalizedTitle,
        duration_minutes: normalizedDuration,
        geofence_latitude: geofenceLatitude,
        geofence_longitude: geofenceLongitude,
        geofence_radius_meters: geofenceRadiusMeters,
        expires_at: expiresAt,
        is_active: true
      }
    });

    return Array.isArray(rows) && rows.length ? this.mapQrSessionRow(rows[0], 0) : null;
  },

  async getMyQRSessionsDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view QR sessions.');
    }

    if (currentUser.role !== 'lecturer') {
      return [];
    }

    const [sessionRows, attendanceRows] = await Promise.all([
      this.restRequest(
        `qr_sessions?created_by_user_id=eq.${encodeURIComponent(currentUser.userId)}&select=id,created_by_user_id,course_code,course_title,duration_minutes,geofence_latitude,geofence_longitude,geofence_radius_meters,expires_at,is_active,created_at,updated_at&order=created_at.desc`
      ),
      this.restRequest(
        `attendance_records?lecturer_id=eq.${encodeURIComponent(currentUser.userId)}&select=id,session_id`
      )
    ]);

    const attendanceCountBySessionId = new Map();
    (Array.isArray(attendanceRows) ? attendanceRows : []).forEach((row) => {
      const sessionId = row.session_id;
      attendanceCountBySessionId.set(sessionId, (attendanceCountBySessionId.get(sessionId) || 0) + 1);
    });

    return (Array.isArray(sessionRows) ? sessionRows : []).map((row) => (
      this.mapQrSessionRow(row, attendanceCountBySessionId.get(row.id) || 0)
    ));
  },

  async getQRSessionDb(sessionId) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view QR sessions.');
    }

    const rows = await this.restRequest(
      `qr_sessions?id=eq.${encodeURIComponent(sessionId)}&select=id,created_by_user_id,course_code,course_title,duration_minutes,geofence_latitude,geofence_longitude,geofence_radius_meters,expires_at,is_active,created_at,updated_at`
    );

    return Array.isArray(rows) && rows.length ? this.mapQrSessionRow(rows[0], 0) : null;
  },

  async deactivateQRSessionDb(sessionId) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to deactivate QR sessions.');
    }

    if (currentUser.role !== 'lecturer') {
      throw new Error('Only lecturers can deactivate QR sessions.');
    }

    await this.restRequest(
      `qr_sessions?id=eq.${encodeURIComponent(sessionId)}&created_by_user_id=eq.${encodeURIComponent(currentUser.userId)}`,
      {
        method: 'PATCH',
        body: {
          is_active: false
        }
      }
    );

    return { success: true };
  },

  async recordAttendanceDb(sessionId, scanContext = {}) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to mark attendance.');
    }

    if (currentUser.role === 'lecturer') {
      throw new Error('Lecturers cannot mark student attendance.');
    }

    const session = await this.getQRSessionDb(sessionId);
    if (!session) {
      throw new Error('This QR session could not be found.');
    }

    if (!session.isActive) {
      throw new Error(session.isExpired ? 'This QR session has expired.' : 'This QR session is no longer active.');
    }

    const location = scanContext.location || {};
    const device = scanContext.device || {};
    const locationVerified = Boolean(location.verified);
    const scanLatitude = locationVerified ? Number(location.latitude) : null;
    const scanLongitude = locationVerified ? Number(location.longitude) : null;
    const scanAccuracyMeters = locationVerified ? Number(location.accuracyMeters) : null;
    const geoDistanceMeters = locationVerified
      ? this.calculateDistanceMeters(scanLatitude, scanLongitude, session.geofenceLatitude, session.geofenceLongitude)
      : null;
    const geofenceRadiusMeters = Number(session.geofenceRadiusMeters || 0) || null;
    const withinGeofence = locationVerified && geofenceRadiusMeters != null && geoDistanceMeters != null
      ? geoDistanceMeters <= geofenceRadiusMeters
      : null;

    try {
      const rows = await this.restRequest('attendance_records', {
        method: 'POST',
        body: {
          session_id: session.id,
          student_id: currentUser.userId,
          lecturer_id: session.createdByUserId,
          course_code: session.courseCode,
          course_title: session.courseTitle,
          location_verified: locationVerified,
          scan_latitude: scanLatitude,
          scan_longitude: scanLongitude,
          scan_accuracy_meters: scanAccuracyMeters,
          geo_distance_meters: geoDistanceMeters,
          geofence_radius_meters: geofenceRadiusMeters,
          within_geofence: withinGeofence,
          device_token: String(device.token || ''),
          device_label: String(device.label || '')
        }
      });

      const createdRow = Array.isArray(rows) && rows.length ? rows[0] : null;
      return this.mapAttendanceRecordRow(createdRow || {
        id: '',
        session_id: session.id,
        student_id: currentUser.userId,
        lecturer_id: session.createdByUserId,
        course_code: session.courseCode,
        course_title: session.courseTitle,
        location_verified: locationVerified,
        scan_latitude: scanLatitude,
        scan_longitude: scanLongitude,
        scan_accuracy_meters: scanAccuracyMeters,
        geo_distance_meters: geoDistanceMeters,
        geofence_radius_meters: geofenceRadiusMeters,
        within_geofence: withinGeofence,
        device_token: String(device.token || ''),
        device_label: String(device.label || ''),
        scanned_at: new Date().toISOString()
      }, {
        name: currentUser.name,
        reg_number: currentUser.regNumber
      });
    } catch (error) {
      const message = String(error.message || '');
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
        throw new Error('You have already scanned attendance for this class.');
      }
      throw error;
    }
  },

  async getAttendanceBySessionDb(sessionId) {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view attendance.');
    }

    const rows = await this.restRequest(
      `attendance_records?session_id=eq.${encodeURIComponent(sessionId)}&select=id,session_id,student_id,lecturer_id,course_code,course_title,location_verified,scan_latitude,scan_longitude,scan_accuracy_meters,geo_distance_meters,geofence_radius_meters,within_geofence,device_token,device_label,scanned_at,created_at&order=scanned_at.desc`
    );

    return Array.isArray(rows) ? rows : [];
  },

  async getMyAttendanceRecordsDb() {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view attendance history.');
    }

    const rows = await this.restRequest(
      `attendance_records?student_id=eq.${encodeURIComponent(currentUser.userId)}&select=id,session_id,student_id,lecturer_id,course_code,course_title,location_verified,scan_latitude,scan_longitude,scan_accuracy_meters,geo_distance_meters,geofence_radius_meters,within_geofence,device_token,device_label,scanned_at,created_at&order=scanned_at.desc`
    );

    return (Array.isArray(rows) ? rows : []).map((row) => this.mapAttendanceRecordRow(row, {
      name: currentUser.name,
      reg_number: currentUser.regNumber
    }));
  },

  async getLecturerAttendanceRecordsDb(sessionId = '') {
    const currentUser = await this.refreshCurrentUserFromDb();
    if (!currentUser) {
      throw new Error('You must be logged in to view attendance records.');
    }

    if (currentUser.role !== 'lecturer') {
      throw new Error('Only lecturers can view lecturer attendance records.');
    }

    const sessionFilter = sessionId ? `&session_id=eq.${encodeURIComponent(sessionId)}` : '';
    const attendanceRows = await this.restRequest(
      `attendance_records?lecturer_id=eq.${encodeURIComponent(currentUser.userId)}${sessionFilter}&select=id,session_id,student_id,lecturer_id,course_code,course_title,location_verified,scan_latitude,scan_longitude,scan_accuracy_meters,geo_distance_meters,geofence_radius_meters,within_geofence,device_token,device_label,scanned_at,created_at&order=scanned_at.desc`
    );

    const rows = Array.isArray(attendanceRows) ? attendanceRows : [];
    const studentIds = [...new Set(rows.map((row) => row.student_id).filter(Boolean))];
    let profilesById = new Map();

    if (studentIds.length) {
      const profileRows = await this.restRequest(
        `profiles?id=in.(${studentIds.map((id) => encodeURIComponent(id)).join(',')})&select=id,name,reg_number`
      );

      profilesById = new Map((Array.isArray(profileRows) ? profileRows : []).map((profile) => [profile.id, profile]));
    }

    const mappedRows = rows.map((row) => this.mapAttendanceRecordRow(row, profilesById.get(row.student_id) || null));
    const devicePeerMap = new Map();

    mappedRows.forEach((record) => {
      if (!record.deviceToken) {
        return;
      }
      const key = `${record.sessionId}::${record.deviceToken}`;
      const list = devicePeerMap.get(key) || [];
      list.push(record);
      devicePeerMap.set(key, list);
    });

    return mappedRows.map((record) => this.buildAttendanceIntegrity(record, devicePeerMap));
  },

  async syncProfileToDb(profile) {
    const { url, anonKey } = this.getSupabaseConfig();
    if (!url || !anonKey || !profile || !profile.email) {
      return { success: false, skipped: true };
    }

    try {
      const response = await fetch(`${url}/rest/v1/profiles?on_conflict=email`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText || 'Profile sync failed.' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Profile sync failed.' };
    }
  },

  // Get current logged-in user
  getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is logged in
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  // Get user role
  getCurrentRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  },

  // Check if current user is a student
  isStudent() {
    return this.getCurrentRole() === 'student';
  },

  // Check if current user is a lecturer
  isLecturer() {
    return this.getCurrentRole() === 'lecturer';
  },

  // Check if current user is a course representative
  isCourseRep() {
    const user = this.getCurrentUser();
    return user ? (user.role === 'courseRep' || !!user.isCourseRep) : false;
  },

  // Logout user
  logout() {
    localStorage.removeItem(this.SESSION_STORAGE_KEY);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    window.location.href = 'login.html';
  },

  // Protect route - redirect if not authenticated
  protectRoute(requiredRole = null) {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }

    if (requiredRole === 'student' && (this.isStudent() || this.isCourseRep())) {
      return true;
    }

    if (requiredRole === 'courseRep' && this.isCourseRep()) {
      return true;
    }

    if (requiredRole && !this.hasRole(requiredRole)) {
      window.location.href = 'dashboard.html';
      return false;
    }
    
    return true;
  },

  // Check if user has specific role
  hasRole(role) {
    if (role === 'courseRep') {
      return this.isCourseRep();
    }
    if (role === 'student') {
      return this.isStudent() || this.isCourseRep();
    }
    return this.getCurrentRole() === role;
  }
};
