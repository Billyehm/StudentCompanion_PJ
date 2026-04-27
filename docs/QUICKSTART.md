# Student Companion - Quick Start Guide

## Documentation Map

Use these docs together:

- `docs/SUPABASE_SETUP.md` - complete Supabase schema, RLS, seeding, and troubleshooting
- `docs/QUICKSTART.md` - local setup and project orientation
- `docs/BACKEND_INTEGRATION_GUIDE.md` - backend and API wiring notes
- `docs/AUTHENTICATION_SYSTEM.md` - auth and role behavior overview
- `docs/IMPLEMENTATION_SUMMARY.md` - historical implementation notes

## 🚀 Getting Started

### Frontend is Ready!
All frontend code for the new features is already implemented:

```
Project Structure
├── index.html                    (Home/Landing page)
├── css/
│   └── style.css              (All styling)
├── pages/
│   ├── dashboard.html         (Main dashboard - UPDATED with new features)
│   ├── attendance.html        (Attendance tracking)
│   ├── directory.html         (Student/Lecturer directory)
│   ├── results.html           (CGPA calculator)
│   ├── medical.html     ✨ NEW (Symptom checker)
│   ├── chatbot.html     ✨ NEW (AI Assistant with map)
│   └── course-rep.html  ✨ NEW (Course management)
└── js/
    ├── shared.js              (Shared functionality)
    ├── dashboard.js           (Dashboard logic)
    ├── medical.js       ✨ NEW (Medical panel logic)
    ├── chatbot.js       ✨ NEW (Chatbot & NLP)
    └── course-rep.js    ✨ NEW (Course rep management)
```

## ✨ New Features Created

### 1. **💊 Medical Panel** (`pages/medical.html`)
- Students select symptoms
- AI predicts possible diseases
- Shows confidence scores
- Links to healthcare API when ready

**To enable with real ML model:** See Backend Setup Guide

### 2. **🤖 AI Assistant** (`pages/chatbot.html`)
- Interactive chatbot with NLP
- Interactive school map
- Ask "Where is CS101?" and get location
- Click buildings for info
- Works with Course Rep panel for real-time location updates

**Features:**
- Pattern-based NLP (can upgrade to spaCy)
- Interactive SVG school map
- Quick question buttons
- Real-time course info

### 3. **👨‍🏫 Course Rep Panel** (`pages/course-rep.html`)
- Create and manage courses
- Set classroom locations
- Send announcements to students
- Track enrolled students
- Works seamlessly with chatbot

**To enable with database:** See Backend Setup Guide

---

## 🔧 Quick Setup (Frontend Only)

The frontend works **standalone** with mock data:

1. Open `index.html` in a browser
2. Click "Continue" → "Login" 
3. Navigate to Dashboard
4. Click any of the new feature cards

Test all features without backend!

---

## 📋 To Add Backend Services

### Prerequisites
```bash
# Python 3.8+
python --version

# Install Flask
pip install flask flask-cors

# For NLP capabilities
pip install spacy
python -m spacy download en_core_web_sm

# For ML/Science
pip install scikit-learn numpy pandas
```

### 1. Create Backend Folder Structure
```bash
mkdir backend
cd backend
mkdir models data
```

### 2. Create Services
Follow the `BACKEND_INTEGRATION_GUIDE.md` guide to create:
- `medical_service.py` - Disease prediction
- `nlp_service.py` - Natural language processing
- `course_service.py` - Course management

### 3. Connect Frontend to Backend
Update the API URLs in JavaScript files:

**Edit `js/medical.js`:**
```javascript
const API_URL = 'http://localhost:5001';
```

**Edit `js/chatbot.js`:**
```javascript
const API_URL = 'http://localhost:5003';
```

**Edit `js/course-rep.js`:**
```javascript
const API_URL = 'http://localhost:5004';
```

### 4. Run Services
```bash
python backend/medical_service.py      # Port 5001
python backend/nlp_service.py          # Port 5003
python backend/course_service.py       # Port 5004
```

---

## 🤖 NLP Integration Examples

### Simple NLP (Current - Pattern Matching)
Already implemented in `js/chatbot.js`:
```javascript
// Extracts "CS101" from "Where is CS101?"
function extractCourseCode(input) {
  const match = input.match(/([A-Z]{2,3}\s?\d{3})/i);
  return match ? match[1].toUpperCase() : null;
}
```

### Advanced NLP (spaCy)
Add to chatbot:
```python
# backend/nlp_service.py
import spacy
nlp = spacy.load('en_core_web_sm')

doc = nlp("Where is the computer science class?")
# Extracts entities: LOCATION, GPE, etc.
# Identifies intent through dependency parsing
```

### Using Google Dialogflow (No-Code)
Alternative: Use Google's Dialogflow:
1. Go to https://dialogflow.cloud.google.com
2. Create agent
3. Define intents (ClassLocation, CourseInfo, etc.)
4. Get webhook URL
5. Call from frontend

---

## 🧠 Training Your ML Model for Medical Panel

### Dataset Sources
1. [Kaggle - Disease Symptoms](https://www.kaggle.com/datasets)
2. [UCI ML Repository](https://archive.ics.uci.edu/ml/)
3. Public health datasets

### Training Steps
```python
# backend/train_model.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Load data
df = pd.read_csv('disease_symptoms.csv')

# Feature: symptoms (multi-hot encoding)
# Target: disease name

# Train
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"Model Accuracy: {accuracy}")
```

---

## 🗄️ Database Setup (PostgreSQL)

```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Linux: sudo apt install postgresql
# Windows: Download from postgresql.org

# Create database
createdb companion_db

# Run migrations (create tables)
psql companion_db < schema.sql

# Connect
psql companion_db
```

---

## 🚀 Deployment

### Local Testing
```bash
# Frontend
python -m http.server 8000

# Visit http://localhost:8000
```

### Cloud Deployment (Heroku Example)

1. **Create `Procfile`:**
```
web: gunicorn backend.med:app
```

2. **Push to Heroku:**
```bash
heroku create companion-app
git push heroku main
```

3. **Update frontend API URLs to production:**
```javascript
const API_URL = 'https://companion-app.herokuapp.com';
```

---

## 📝 Testing Checklist

- [ ] Medical panel shows symptoms
- [ ] Chatbot responds to location queries
- [ ] Course rep can create courses
- [ ] Dashboard links all features
- [ ] Payment methods selectable
- [ ] Announcements storeable
- [ ] Map is interactive

---

## 🔒 Security Checklist

- [ ] Add authentication (JWT tokens)
- [ ] Validate all inputs
- [ ] Use HTTPS in production
- [ ] Add CORS headers
- [ ] Rate limiting on APIs
- [ ] Don't expose sensitive data
- [ ] Hash passwords
- [ ] Use environment variables for keys

---

## 📞 Troubleshooting

**Q: Chatbot not responding**
A: Check if NLP service is running on port 5003

**Q: Course rep can't save courses**
A: Check browser console for JavaScript errors

---

## Next Steps

1. ✅ Frontend complete
2. 👉 Create backend services (see `BACKEND_INTEGRATION_GUIDE.md`)
3. 👉 Train ML models for medical panel
4. 👉 Set up database
5. 👉 Add authentication
6. 👉 Deploy to production
7. 👉 Add push notifications
8. 👉 Implement WebSocket for real-time updates

---

## 📚 Resources

- **Flask Docs:** https://flask.palletsprojects.com/
- **spaCy NLP:** https://spacy.io/
- **scikit-learn ML:** https://scikit-learn.org/
- **PostgreSQL:** https://www.postgresql.org/
- **WebSocket:** https://socket.io/

---

**Built with ❤️ for students**
