# HavenRent backend setup

Render environment variables:
- MONGO_URI
- JWT_SECRET
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

For testing, use Razorpay Test Mode keys. For real ₹250 payments, complete Razorpay KYC and switch to Live Mode keys. Never put RAZORPAY_KEY_SECRET in the frontend.

Property upload flow: frontend creates a ₹250 order -> Razorpay Checkout -> backend verifies signature and captured payment -> property POST requires the verified order/payment IDs.
