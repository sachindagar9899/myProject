# AntiGravity - Futuristic Social Media Platform

Welcome to the AntiGravity monorepo. This is a premium, cyberpunk-themed full-stack social media platform inspired by Instagram but designed for the future.

## Tech Stack
*   **Frontend**: React (Vite), Tailwind CSS v4, Framer Motion, Zustand, React Router, Socket.io-client, Simple-peer (WebRTC).
*   **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT.

## Features
*   **Neon/Cyberpunk UI**: Glassmorphism, floating animations, dark mode base with neon purple, blue, and pink gradients.
*   **Authentication**: JWT-based login and registration.
*   **Social Feed**: Infinite scrolling feed, stories strip, and responsive layout (sidebar navigation).
*   **Real-time Messaging**: Instant chat with WebSockets.
*   **Video Calling**: WebRTC-powered high-quality peer-to-peer video calls with mute/video toggles.
*   **User Profiles**: Dynamic profiles with post grids, stats, and cover photos.

## Folder Structure
```
.
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/           # User.js, Post.js, Message.js
│   ├── routes/           # auth.js, users.js, posts.js
│   ├── server.js         # Entry point, Socket.io setup
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   # Layout.js, VideoCallModal.js
    │   ├── pages/        # AuthPage, HomePage, MessagesPage, ProfilePage
    │   ├── store/        # useAuthStore.js (Zustand)
    │   ├── App.jsx       # Routing
    │   └── index.css     # Tailwind v4 & Global Neon Theme
    ├── vite.config.js
    └── package.json
```

## Setup Instructions

### 1. Backend Setup
1. Navigate to the `backend` directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=super_secret_neon_key
   ```
4. Start the server: `npm start` (Runs on http://localhost:5000)

### 2. Frontend Setup
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `frontend` directory (optional for API URLs):
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Start the development server: `npm run dev` (Runs on http://localhost:5173)

## Deployment Configuration

### Frontend (Vercel)
1. Push the repository to GitHub.
2. Go to Vercel and import the repository.
3. Set the **Root Directory** to `frontend`.
4. Vercel will automatically detect Vite. Set the Build Command to `npm run build` and Output Directory to `dist`.
5. Add `VITE_API_URL` pointing to your deployed backend URL in the Environment Variables.
6. Deploy.

### Backend (Render / Railway)
1. Go to Render.com or Railway.app and create a new Web Service.
2. Connect your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. Set the Build Command to `npm install` and Start Command to `node server.js`.
5. Add the necessary Environment Variables (`MONGO_URI`, `JWT_SECRET`, `PORT=5000`).
6. Deploy. (Note: Ensure your MongoDB cluster IP access list allows connections from anywhere `0.0.0.0/0`).
