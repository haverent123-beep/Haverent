# HavenRent Backend – Fixed

## Password reset
Owner, customer and service-provider accounts can use:

- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-otp`
- `POST /api/auth/reset-password`

The OTP is 6 digits, expires after 10 minutes, and is stored only as a bcrypt hash.

### Render environment variables for email
Add these to the Render backend service:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=HavenRent <your-email@gmail.com>
```

For Gmail, use a Google **App Password**, not your normal Gmail password.

Existing required variables remain:
`MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PAYMENT_UPI_ID`, and optionally `FRONTEND_ORIGINS`.

## Important fixes
- Owner/provider login token validation uses a real 4-digit numeric regex.
- Booking fee is ₹199.
- Property upload fee is ₹250.
- Password reset does not reveal whether an email is registered.
