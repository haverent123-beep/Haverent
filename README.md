# HavenRent 2.0 — Animated Frontend + API

## Frontend
cd HavenRent-Animated-Frontend
npm install
npm run build

Set `VITE_API_URL` to your Render API URL.

## Backend
cd backend
npm install
npm start

Required Render environment variables:
- MONGO_URI
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD
- PAYMENT_UPI_ID
- FRONTEND_ORIGINS

## Main flows
- Customer registration/login → customer dashboard
- Owner registration/login → owner dashboard
- Owner pays ₹250 by UPI → submits transaction ID → admin verifies → property upload unlocked
- Provider registration → pending verification → admin verifies provider → provider jobs enabled
- Customer service request → provider accepts → provider updates status
- Owner receives booking → owner confirms/cancels
- Customer can view/cancel pending booking

## Payment & verification flow (updated)
- Owner registration generates a unique `OWN-XXXXXXXXXX` owner token and returns it after registration/login.
- Owner property-listing fee: `PROPERTY_UPLOAD_FEE` (default ₹250). Property upload is unlocked only after admin verifies that UPI payment.
- Service-provider registration fee: `PROVIDER_REGISTRATION_FEE` (default ₹199). Admin must verify the provider payment before approving the provider account.
- Customer booking fee: `BOOKING_FEE` (default ₹499). A booking request is created, the customer submits the UPI transaction ID, and admin verifies the booking payment.
- Admin payment control centre now handles all submitted payment purposes: property upload, provider registration, and booking.
- Customer booking receipt becomes available only after booking payment verification. The customer dashboard can print/save the receipt.
- Render environment variables should include `PROVIDER_REGISTRATION_FEE`, `BOOKING_FEE`, and the existing `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PAYMENT_UPI_ID`, `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_ORIGINS`.
