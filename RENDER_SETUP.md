# HavenRent Backend — Render setup

Build command: `npm install`
Start command: `npm start`

Required environment variables:
- `MONGO_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = a long random secret
- `PAYMENT_UPI_ID` = `9553473078-4@ybl`

The payment configuration endpoint is public so the frontend can load the UPI ID/fee before authentication. Payment submission and property creation remain authenticated.

ADMIN PAYMENT VERIFICATION
Set these Render environment variables:
ADMIN_EMAIL=your admin email
ADMIN_PASSWORD=your strong admin password
PAYMENT_UPI_ID=your UPI ID

Owner-submitted transaction IDs remain pending. They do NOT unlock property upload until an admin verifies the payment at /admin. For automatic bank verification, integrate a real payment gateway such as Razorpay.


## Owner UPI verification flow
- Owner submits a transaction/reference ID; it stays `submitted`.
- The owner sees **Pending verification** and cannot upload yet.
- Admin opens the frontend `/admin`, logs in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, checks the UPI transaction in the bank/UPI app, and clicks **Verify payment** or **Reject**.
- Only a payment with status `verified`, matching the owner and ₹250 amount, can create a property. The backend enforces this independently of the frontend.
- The owner dashboard refreshes payment status every 5 seconds, so upload unlocks after admin verification.
