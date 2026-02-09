# Event Management System

A full-stack web application for managing college events, clubs, and registrations with role-based access control.

## 🏗️ Project Structure

```
DASS-Assignment-1/
├── frontend/           # React + Vite frontend application
├── backend/            # Node.js + Express + MongoDB backend API
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## 🚀 Features

### Phase 1: Foundation
- User authentication (Login/Register)
- Role-based access (Participant, Organizer, Admin)
- Event browsing and viewing

### Phase 2: Participant Features
- Event registration (individual and team)
- My Events dashboard
- Profile management
- QR code ticket generation

### Phase 3: Organizer Features
- Create and manage events
- Event approval workflow
- Registration management
- Payment approval
- QR scanner for check-ins

### Phase 4: Admin Features
- User management
- Club management
- Event approval/rejection
- System-wide analytics

### Phase 5: Advanced Features
- Discussion forum (per event)
- Feedback and rating system
- Team registration with validations
- Payment tracking

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Routing:** React Router v7
- **State Management:** Context API
- **Styling:** CSS Modules
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB (Atlas)
- **ODM:** Mongoose
- **Authentication:** JWT + bcryptjs
- **File Upload:** Multer
- **CORS:** Enabled for frontend communication

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account (or local MongoDB)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:5174`

### Backend Setup

```bash
cd backend
npm install

# Create .env file (use .env.example as template)
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

npm run dev
```

Backend will run on: `http://localhost:5000`

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5174
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM=no-reply@eventhub.local
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/updateprofile` - Update user profile
- `PUT /api/auth/updatepassword` - Change password

### Event Endpoints
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Organizer)
- `PUT /api/events/:id` - Update event (Organizer/Admin)
- `DELETE /api/events/:id` - Delete event (Organizer/Admin)
- `GET /api/events/organizer/my-events` - Get organizer's events
- `GET /api/events/:id/stats` - Get event statistics
- `PUT /api/events/:id/approve` - Approve/reject event (Admin)

## 👥 User Roles

1. **Participant**
   - Browse and register for events
   - Manage personal registrations
   - Join teams
   - Provide feedback

2. **Organizer**
   - Create and manage events
   - Approve registrations and payments
   - Scan QR codes for check-in
   - View event statistics

3. **Admin**
   - Manage users and clubs
   - Approve/reject events
   - System-wide monitoring
   - Full access to all features

## 🧪 Development Status

### ✅ Completed
- Phase 1: Backend Authentication & Database Models
- Phase 2: Event Management APIs
- Frontend: All 5 phases (Foundation to Advanced Features)

### 🚧 In Progress
- Backend Phase 3: Registration & Payment APIs
- Backend Phase 4: Admin & Club Management APIs
- Backend Phase 5: Advanced Features APIs

### 📋 Pending
- Frontend-Backend API integration
- Testing suite
- Deployment configuration

## 🤝 Contributing

This is an academic project for DASS (Design and Analysis of Software Systems) course.

## 📄 License

This project is created for educational purposes.

## 👨‍💻 Author

IIIT Hyderabad Student

---

**Last Updated:** February 2026
