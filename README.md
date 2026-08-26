# HavenRent — Frontend + Backend

## Frontend
npm install
npm run dev

Set `.env`:
VITE_API_URL=https://have-rent.onrender.com

## Backend
cd backend
npm install
npm start

Set Render environment variables:
MONGO_URI = your MongoDB Atlas connection string
JWT_SECRET = a long random secret

The backend exposes:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/properties
- GET /api/properties/:id
- POST/PUT/DELETE /api/properties
- POST /api/bookings
- GET /api/bookings/my
- GET /api/bookings/owner
- PATCH /api/bookings/:id/status
