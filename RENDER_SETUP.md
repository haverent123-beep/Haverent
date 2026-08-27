# HavenRent Backend — Render setup

Build command: `npm install`
Start command: `npm start`

Required environment variables:
- `MONGO_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = a long random secret
- `PAYMENT_UPI_ID` = `9553473078-4@ybl`

The payment configuration endpoint is public so the frontend can load the UPI ID/fee before authentication. Payment submission and property creation remain authenticated.
