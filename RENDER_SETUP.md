HavenRent Backend — Render setup

Environment variables:
MONGO_URI = your MongoDB Atlas connection string
JWT_SECRET = a long random secret
PAYMENT_UPI_ID = 9553473078-4@ybl

Deploy with:
Build: npm install
Start: npm start
Health: /api/health

The property listing fee is ₹250. Owners pay to the configured UPI ID and submit the UPI transaction ID. The backend records the submission and unlocks the property upload. Automatic bank verification is not possible without a supported payment gateway/bank API.
