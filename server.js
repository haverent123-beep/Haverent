
import express from "express";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const PROPERTY_UPLOAD_FEE = 199;
const PROVIDER_REGISTRATION_FEE = 199;
const BOOKING_FEE = 199;
const PAYMENT_UPI_ID = process.env.PAYMENT_UPI_ID || "9553473078-4@ybl";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const EXTRA_ORIGINS = String(process.env.FRONTEND_ORIGINS || "").split(",").map(x=>x.trim()).filter(Boolean);
const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "");
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER || "no-reply@haverent.in").trim();

const mailTransport = SMTP_HOST && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    })
  : null;


const SERVICE_CATALOG = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification"
];
const PROVIDER_SERVICE_OPTIONS = SERVICE_CATALOG;
const PROVIDER_SERVICES = SERVICE_CATALOG;


const allowedOrigins = [
  "https://haverent.in",
  "https://www.haverent.in",
  "https://nethouse.netlify.app",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || EXTRA_ORIGINS.includes(origin) || /^https:\/\/.*\.netlify\.app$/.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
}));
app.options(/.*/, cors());
app.use(express.json({ limit: "15mb", verify: (req, _res, buf) => { req.rawBody = buf; } }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer","owner","provider"], default: "customer" },
  verificationStatus: { type: String, enum: ["not_required","pending","verified","rejected"], default: "not_required" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  profileImage: { type: String, default: "" },
  providerServices: { type: [String], default: [] },
  availability: { type: String, enum: ["online","offline"], default: "online" },
  workingHours: {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "18:00" }
  },
  serviceAreas: { type: [String], default: [] },
  // Password-reset OTP fields. The OTP itself is never stored in plain text.
  resetOtpHash: { type: String, default: "" },
  resetOtpExpiresAt: { type: Date, default: null },
  accountStatus: { type: String, enum: ["active","suspended"], default: "active" },
  suspensionReason: { type: String, default: "" },
  providerToken: { type: String, unique: true, sparse: true },
  ownerToken: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  state: String,
  city: String,
  area: String,
  location: String,
  rent: { type: Number, required: true },
  type: { type: String, default: "Flat" },
  description: String,
  image: String,
  images: { type: [String], default: [] },
  contact: String,
  latitude: Number,
  longitude: Number,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  available: { type: Boolean, default: true },
  // Room/PG-specific listing details
  roomType: { type: String, default: "" },
  occupancy: { type: Number, default: null },
  totalRooms: { type: Number, default: null },
  availableRooms: { type: Number, default: null },
  gender: { type: String, default: "" },
  furnished: { type: String, default: "" },
  food: { type: String, default: "" },
  attachedBathroom: { type: Boolean, default: false },
  securityDeposit: { type: Number, default: null },
  amenities: { type: [String], default: [] },
  // Flat-specific listing details
  bhk: { type: Number, default: null },
  bathrooms: { type: Number, default: null },
  balconies: { type: Number, default: null },
  areaSqft: { type: Number, default: null },
  floor: { type: Number, default: null },
  totalFloors: { type: Number, default: null },
  facing: { type: String, default: "" },
  propertyAge: { type: String, default: "" },
  preferredTenants: { type: String, default: "" },
  maintenance: { type: Number, default: null },
  parking: { type: String, default: "" },
  lift: { type: Boolean, default: false },
  powerBackup: { type: Boolean, default: false },
  // Advanced type-specific fields
  houseType: { type: String, default: "" },
  waterSupply: { type: String, default: "" },
  terrace: { type: Boolean, default: false },
  gatedCommunity: { type: Boolean, default: false },
  petFriendly: { type: Boolean, default: false },
  foodPlan: { type: String, default: "" },
  curfew: { type: String, default: "" },
  laundry: { type: Boolean, default: false },
  housekeeping: { type: Boolean, default: false },
  bedCount: { type: Number, default: null },
  privateEntrance: { type: Boolean, default: false },
  rules: { type: String, default: "" }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending","confirmed","cancelled"], default: "pending" },
  paymentStatus: { type: String, enum: ["pending","submitted","verified","rejected"], default: "pending" },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
  receiptNo: { type: String, default: "" },
  moveInDate: String
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Property = mongoose.model("Property", propertySchema);
const Booking = mongoose.model("Booking", bookingSchema);

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: String, required: true, unique: true },
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true, default: PROPERTY_UPLOAD_FEE },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted" },
  purpose: { type: String, enum: ["property_upload","provider_registration","booking"], default: "property_upload" },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  receiptNo: { type: String, default: "" },
  usedAt: { type: Date, default: null }
}, { timestamps: true });
paymentSchema.index({ transactionId: 1 }, { unique: true });
const Payment = mongoose.model("Payment", paymentSchema);
const serviceRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  service: { type: String, required: true, trim: true },
  status: { type: String, enum: ["pending","accepted","in_progress","completed","cancelled"], default: "pending" },
  preferredDate: String,
  preferredTime: String,
  address: String,
  notes: String,
  partnerName: String,
  partnerPhone: String,
  assignedProvider: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  quotedPrice: { type: Number, default: null },
  providerNote: String
}, { timestamps: true });
const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);

const reviewSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest", required: true, unique: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, default: "" }
}, { timestamps: true });
const Review = mongoose.model("Review", reviewSchema);

const notificationSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  title:{type:String,required:true},
  message:{type:String,required:true},
  read:{type:Boolean,default:false}
},{timestamps:true});
const Notification = mongoose.model("Notification", notificationSchema);

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(req,res,next) {
  const h=req.headers.authorization || "";
  const token=h.startsWith("Bearer ") ? h.slice(7) : null;
  if(!token) return res.status(401).json({message:"Authentication required"});
  try { req.user=jwt.verify(token,JWT_SECRET); next(); }
  catch { return res.status(401).json({message:"Invalid or expired token"}); }
}


function normalizeEmail(value) {
  return String(value || "").toLowerCase().trim();
}

function passwordResetOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendPasswordResetOtp(email, name, otp) {
  if (!mailTransport) {
    const err = new Error("Password reset email service is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in Render.");
    err.code = "SMTP_NOT_CONFIGURED";
    throw err;
  }

  await mailTransport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "HavenRent password reset OTP",
    text: `Hi ${name || "there"},\n\nYour HavenRent password reset OTP is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>HavenRent Password Reset</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your password reset OTP is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
      <p>This OTP expires in <b>10 minutes</b>.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>`
  });
}

app.post(["/api/auth/forgot-password", "/api/forgot-password"], async (req,res)=>{
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({message:"Database is not connected. Please check MongoDB Atlas settings in Render."});
    }

    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({message:"Email is required"});

    const user = await User.findOne({email});
    // Do not reveal whether an email exists.
    if (!user) {
      return res.json({message:"If an account exists for this email, a password reset OTP has been sent."});
    }

    const otp = passwordResetOtp();
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetOtp(user.email, user.name, otp);
    } catch (mailErr) {
      user.resetOtpHash = "";
      user.resetOtpExpiresAt = null;
      await user.save();
      if (mailErr.code === "SMTP_NOT_CONFIGURED") {
        return res.status(503).json({message:mailErr.message});
      }
      console.error("Password reset email error:", mailErr);
      return res.status(502).json({message:"Unable to send the reset email right now. Please try again later."});
    }

    return res.json({message:"Password reset OTP sent to your registered email. It expires in 10 minutes."});
  } catch(e) {
    console.error("Forgot password error:", e);
    res.status(500).json({message:"Unable to start password reset"});
  }
});

app.post(["/api/auth/verify-reset-otp", "/api/verify-reset-otp"], async (req,res)=>{
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({message:"Database is not connected."});
    }

    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({message:"Enter the 6-digit OTP"});
    }

    const user = await User.findOne({email});
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return res.status(400).json({message:"Invalid or expired OTP"});
    }
    if (user.resetOtpExpiresAt.getTime() < Date.now()) {
      user.resetOtpHash = "";
      user.resetOtpExpiresAt = null;
      await user.save();
      return res.status(400).json({message:"OTP has expired. Please request a new OTP."});
    }
    if (!(await bcrypt.compare(otp, user.resetOtpHash))) {
      return res.status(400).json({message:"Invalid OTP"});
    }

    res.json({valid:true,message:"OTP verified. You can now set a new password."});
  } catch(e) {
    console.error("Verify reset OTP error:", e);
    res.status(500).json({message:"Unable to verify OTP"});
  }
});

app.post(["/api/auth/reset-password", "/api/reset-password"], async (req,res)=>{
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({message:"Database is not connected."});
    }

    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();
    const newPassword = String(req.body?.newPassword || req.body?.password || "");

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({message:"Email and valid 6-digit OTP are required"});
    }
    if (newPassword.length < 6) {
      return res.status(400).json({message:"New password must be at least 6 characters"});
    }

    const user = await User.findOne({email});
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return res.status(400).json({message:"Invalid or expired OTP"});
    }
    if (user.resetOtpExpiresAt.getTime() < Date.now()) {
      user.resetOtpHash = "";
      user.resetOtpExpiresAt = null;
      await user.save();
      return res.status(400).json({message:"OTP has expired. Please request a new OTP."});
    }
    if (!(await bcrypt.compare(otp, user.resetOtpHash))) {
      return res.status(400).json({message:"Invalid OTP"});
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetOtpHash = "";
    user.resetOtpExpiresAt = null;
    await user.save();

    res.json({message:"Password reset successfully. Please login with your new password."});
  } catch(e) {
    console.error("Reset password error:", e);
    res.status(500).json({message:"Unable to reset password"});
  }
});

app.post("/api/admin/login", (req,res)=>{
  const email=String(req.body?.email||"").toLowerCase().trim();
  const password=String(req.body?.password||"");
  if(!ADMIN_EMAIL || !ADMIN_PASSWORD) return res.status(503).json({message:"Admin credentials are not configured on the backend"});
  if(email!==ADMIN_EMAIL || password!==ADMIN_PASSWORD) return res.status(401).json({message:"Invalid admin credentials"});
  const token=jwt.sign({id:"admin",role:"admin",email:ADMIN_EMAIL},JWT_SECRET,{expiresIn:"12h"});
  res.json({token,user:{id:"admin",email:ADMIN_EMAIL,role:"admin",name:"HavenRent Admin"}});
});
function adminAuth(req,res,next){
  auth(req,res,()=>{ if(req.user?.role!=="admin") return res.status(403).json({message:"Admin access required"}); next(); });
}

app.get("/", (_,res)=>res.json({name:"HavenRent API",status:"online"}));
app.get("/api/health", (_,res)=>res.json({ok:true, service:"HavenRent API", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"}));

app.post(["/api/auth/register", "/api/register"], async (req,res)=>{
  if (mongoose.connection.readyState !== 1) return res.status(503).json({message:"Database is not connected. Please check MongoDB Atlas settings in Render."});
  try{
    const {name,email,password,role="customer"}=req.body;
    if(!name || !email || !password) return res.status(400).json({message:"Name, email and password are required"});
    const normalizedEmail=String(email).toLowerCase().trim();
    if(await User.findOne({email:normalizedEmail})) return res.status(409).json({message:"Email already registered"});

    const hash=await bcrypt.hash(password,12);
    const safeRole=["customer","owner","provider"].includes(String(role).toLowerCase()) ? String(role).toLowerCase() : "customer";

    let providerServices=Array.isArray(req.body?.providerServices)
      ? [...new Set(req.body.providerServices.map(x=>String(x).trim()).filter(Boolean))]
      : [];

    if(safeRole==="provider"){
      providerServices=providerServices.filter(x=>PROVIDER_SERVICE_OPTIONS.includes(x)).slice(0,10);
      if(!providerServices.length) return res.status(400).json({message:"Please select at least one service before creating a provider account"});
    }else{
      providerServices=[];
    }

    const verificationStatus=safeRole==="provider" ? "pending" : "not_required";

    // Owner and service-provider login tokens are exactly 4 digits.
    let ownerToken;
    let providerToken;
    if (safeRole === "owner") {
      do { ownerToken = String(crypto.randomInt(1000, 10000)); }
      while (await User.exists({ ownerToken }));
    }
    if (safeRole === "provider") {
      do { providerToken = String(crypto.randomInt(1000, 10000)); }
      while (await User.exists({ providerToken }));
    }

    const user=await User.create({
      name:String(name).trim(),
      email:normalizedEmail,
      password:hash,
      role:safeRole,
      verificationStatus,
      phone:String(req.body?.phone||"").trim(),
      address:String(req.body?.address||"").trim(),
      city:String(req.body?.city||"").trim(),
      providerServices,
      providerToken,
      ownerToken
    });

    res.status(201).json({token:tokenFor(user),user:{
      id:user._id,name:user.name,email:user.email,role:user.role,
      verificationStatus:user.verificationStatus,phone:user.phone,
      providerServices:user.providerServices,providerToken:user.providerToken||"",
      ownerToken:user.ownerToken||""
    }});
  }catch(e){res.status(500).json({message:e.message});}
});

app.post(["/api/auth/login", "/api/login"], async (req,res)=>{
  if (mongoose.connection.readyState !== 1) return res.status(503).json({message:"Database is not connected. Please check MongoDB Atlas settings in Render."});
  try{
    const {email,password,loginToken}=req.body;
    const user=await User.findOne({email:String(email||"").toLowerCase().trim()});
    if(!user || !(await bcrypt.compare(password||"",user.password))) return res.status(401).json({message:"Invalid email or password"});

    if (["owner","provider"].includes(user.role)) {
      if (!/^\d{4}$/.test(String(loginToken||""))) {
        return res.status(400).json({message:"A valid 4-digit login token is required for owner and service-provider accounts."});
      }
      const expected = user.role === "owner" ? user.ownerToken : user.providerToken;
      if (!expected || String(loginToken) !== String(expected)) {
        return res.status(401).json({message:"Incorrect 4-digit login token."});
      }
    }

    res.json({token:tokenFor(user),user:{id:user._id,name:user.name,email:user.email,role:user.role,verificationStatus:user.verificationStatus,phone:user.phone,address:user.address,city:user.city,profileImage:user.profileImage,providerServices:user.providerServices,providerToken:user.providerToken||"",ownerToken:user.ownerToken||""}});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/auth/me",auth,async(req,res)=>{
  const user=await User.findById(req.user.id).select("-password");
  if(!user) return res.status(404).json({message:"User not found"});
  res.json({user});
});


// ---------------- CUSTOMER PROFILE ----------------
function customerOnly(req,res,next){
  auth(req,res,()=>{
    if(req.user?.role!=="customer") return res.status(403).json({message:"Customer access required"});
    next();
  });
}

app.get("/api/customer/profile", customerOnly, async (req,res)=>{
  try{
    const customer=await User.findOne({_id:req.user.id,role:"customer"}).select("-password");
    if(!customer) return res.status(404).json({message:"Customer account not found"});
    res.json({customer});
  }catch(e){res.status(500).json({message:e.message});}
});

app.put("/api/customer/profile", customerOnly, async (req,res)=>{
  try{
    const customer=await User.findOne({_id:req.user.id,role:"customer"});
    if(!customer) return res.status(404).json({message:"Customer account not found"});
    const name=String(req.body?.name||"").trim();
    const phone=String(req.body?.phone||"").trim();
    const address=String(req.body?.address||"").trim();
    const city=String(req.body?.city||"").trim();
    if(name.length<2) return res.status(400).json({message:"Please enter a valid name"});
    customer.name=name; customer.phone=phone; customer.address=address; customer.city=city;
    await customer.save();
    res.json({customer:await User.findById(customer._id).select("-password"),message:"Profile updated successfully"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/customer/notifications", customerOnly, async (req,res)=>{
  try{
    const notifications=await Notification.find({user:req.user.id}).sort({createdAt:-1}).limit(100);
    res.json({notifications,unreadCount:notifications.filter(n=>!n.read).length});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/customer/notifications/:id/read", customerOnly, async (req,res)=>{
  try{
    const n=await Notification.findOneAndUpdate({_id:req.params.id,user:req.user.id},{read:true},{new:true});
    if(!n) return res.status(404).json({message:"Notification not found"});
    res.json({notification:n});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/customer/notifications/read-all", customerOnly, async (req,res)=>{
  try{
    await Notification.updateMany({user:req.user.id,read:false},{$set:{read:true}});
    res.json({message:"All notifications marked as read"});
  }catch(e){res.status(500).json({message:e.message});}
});

// ---------------- OWNER ACCOUNT & DASHBOARD ----------------
function ownerOnly(req,res,next){
  auth(req,res,()=>{
    if(req.user?.role!="owner") return res.status(403).json({message:"Owner access required"});
    next();
  });
}

app.get("/api/owner/me", ownerOnly, async (req,res)=>{
  try{
    const owner=await User.findById(req.user.id).select("-password");
    if(!owner) return res.status(404).json({message:"Owner account not found"});
    const [properties, payments, bookings, notifications] = await Promise.all([
      Property.find({owner:req.user.id}).sort({createdAt:-1}),
      Payment.find({user:req.user.id}).sort({createdAt:-1}).limit(30),
      Booking.find({}).populate("property").populate("user","name email phone").sort({createdAt:-1})
        .then(rows=>rows.filter(b=>b.property && String(b.property.owner)===String(req.user.id))),
      Notification.find({user:req.user.id}).sort({createdAt:-1}).limit(30)
    ]);
    const unreadNotifications=notifications.filter(n=>!n.read).length;
    res.json({owner,properties,payments,bookings,notifications,unreadNotifications});
  }catch(e){res.status(500).json({message:e.message});}
});

app.put("/api/owner/profile", ownerOnly, async (req,res)=>{
  try{
    const owner=await User.findById(req.user.id);
    if(!owner) return res.status(404).json({message:"Owner account not found"});
    const name=String(req.body?.name||"").trim();
    const phone=String(req.body?.phone||"").trim();
    if(name.length<2) return res.status(400).json({message:"Please enter a valid name"});
    owner.name=name; owner.phone=phone;
    await owner.save();
    res.json({owner:await User.findById(owner._id).select("-password"),message:"Owner profile updated successfully"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/owner/properties", ownerOnly, async (req,res)=>{
  try{
    const properties=await Property.find({owner:req.user.id}).sort({createdAt:-1});
    res.json({properties});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/owner/payments", ownerOnly, async (req,res)=>{
  try{
    const payments=await Payment.find({user:req.user.id}).sort({createdAt:-1}).limit(50);
    res.json({payments});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/owner/notifications/:id/read", ownerOnly, async (req,res)=>{
  try{
    const n=await Notification.findOneAndUpdate({_id:req.params.id,user:req.user.id},{read:true},{new:true});
    if(!n) return res.status(404).json({message:"Notification not found"});
    res.json({notification:n});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/owner/notifications/read-all", ownerOnly, async (req,res)=>{
  try{
    await Notification.updateMany({user:req.user.id,read:false},{$set:{read:true}});
    res.json({message:"All notifications marked as read"});
  }catch(e){res.status(500).json({message:e.message});}
});

const demoProperties = [
  { _id:"demo-1", title:"Modern Luxury Apartment", city:"Visakhapatnam", location:"Visakhapatnam, Andhra Pradesh", rent:14500, type:"Flat", description:"A modern apartment for comfortable everyday living.", image:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80" },
  { _id:"demo-2", title:"Cozy City Home", city:"Hyderabad", location:"Hyderabad, Telangana", rent:12000, type:"House", description:"A bright and comfortable rental home.", image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" }
];

app.get("/api/properties",async(req,res)=>{
  try{
    const mode=String(req.query.mode||"").toLowerCase();
    const city=String(req.query.city||"").trim();
    const state=String(req.query.state||"").trim();
    const area=String(req.query.area||"").trim();
    const type=String(req.query.type||"").trim();
    const maxRent=req.query.maxRent!==undefined?Number(req.query.maxRent):null;
    const lat=Number(req.query.lat ?? req.query.latitude);
    const lng=Number(req.query.lng ?? req.query.longitude);
    const radius=Math.min(Math.max(Number(req.query.radius)||5,1),100);
    const q={};
    if(city) q.city=new RegExp(city,"i");
    if(state) q.state=new RegExp(state,"i");
    if(area) q.area=new RegExp(area,"i");
    if(type && type!=="All") q.type=type;
    if(Number.isFinite(maxRent) && maxRent>0) q.rent={$lte:maxRent};
    if(!MONGO_URI) return res.json({properties:demoProperties});
    let properties=await Property.find(q).sort({createdAt:-1}).populate("owner","name email");
    if(mode==="nearby" && Number.isFinite(lat) && Number.isFinite(lng)){
      const toRad=n=>n*Math.PI/180;
      properties=properties.map(p=>{
        const obj=p.toObject();
        if(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)){
          const dLat=toRad(p.latitude-lat),dLng=toRad(p.longitude-lng);
          const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat))*Math.cos(toRad(p.latitude))*Math.sin(dLng/2)**2;
          obj.distanceKm=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
        }
        return obj;
      }).filter(p=>p.distanceKm!==undefined && p.distanceKm<=radius).sort((a,b)=>a.distanceKm-b.distanceKm);
    }
    res.json({properties});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/properties/:id",async(req,res)=>{
  try{
    const p=await Property.findById(req.params.id).populate("owner","name email");
    if(!p) {
      const demo=demoProperties.find(x=>String(x._id)===String(req.params.id));
      if(demo) return res.json({property:demo});
      return res.status(404).json({message:"Property not found"});
    }
    res.json({property:p});
  }catch(e){res.status(400).json({message:"Invalid property id"});}
});

app.get("/api/payments/config", async (_req,res) => {
  res.json({ enabled:true, method:"UPI", upiId:PAYMENT_UPI_ID, currency:"INR", amounts:{property_upload:PROPERTY_UPLOAD_FEE, provider_registration:PROVIDER_REGISTRATION_FEE, booking:BOOKING_FEE} });
});

app.get("/api/payments/my",auth,async(req,res)=>{ try{ const payments=await Payment.find({user:req.user.id}).populate("booking").sort({createdAt:-1}).limit(50); res.json({payments}); }catch(e){res.status(500).json({message:e.message});} });

app.post("/api/payments/manual/submit", auth, async (req,res) => {
  try {
    const purpose=String(req.body?.purpose||"").trim();
    const transactionId=String(req.body?.transactionId||"").trim();
    if(!["property_upload","provider_registration","booking"].includes(purpose))
      return res.status(400).json({message:"Invalid payment purpose"});
    if(transactionId.length<6 || transactionId.length>100)
      return res.status(400).json({message:"Please enter a valid UPI transaction ID"});

    if(await Payment.findOne({transactionId}))
      return res.status(409).json({message:"This transaction ID has already been submitted"});

    if(purpose==="property_upload" && req.user.role!=="owner")
      return res.status(403).json({message:"Only owners can pay the property upload fee"});
    if(purpose==="provider_registration" && req.user.role!=="provider")
      return res.status(403).json({message:"Only service providers can pay the provider registration fee"});
    if(purpose==="booking" && req.user.role!=="customer")
      return res.status(403).json({message:"Only customers can pay the booking fee"});

    let booking=null;
    if(purpose==="booking"){
      booking=await Booking.findOne({_id:String(req.body?.bookingId||""),user:req.user.id});
      if(!booking) return res.status(404).json({message:"Booking not found"});
      if(booking.status==="cancelled") return res.status(400).json({message:"This booking has been cancelled"});
    }

    if(purpose==="property_upload" || purpose==="provider_registration"){
      const pending=await Payment.findOne({user:req.user.id,purpose,status:"submitted"});
      if(pending) return res.status(409).json({message:"Your payment is already pending admin verification"});
    }

    if(purpose==="provider_registration"){
      const provider=await User.findById(req.user.id).select("providerServices role");
      if(!provider || provider.role!=="provider") return res.status(404).json({message:"Provider not found"});
      if(!provider.providerServices?.length) return res.status(400).json({message:"Select at least one service before paying"});
    }

    const amount=purpose==="property_upload" ? PROPERTY_UPLOAD_FEE : purpose==="provider_registration" ? PROVIDER_REGISTRATION_FEE : BOOKING_FEE;
    const payment=await Payment.create({
      user:req.user.id,
      orderId:`${purpose}_${req.user.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      transactionId,amount,currency:"INR",status:"submitted",purpose,
      booking:booking?booking._id:null
    });

    if(booking){
      booking.paymentStatus="submitted";
      booking.paymentId=payment._id;
      await booking.save();
    }

    res.status(201).json({submitted:true,paymentId:String(payment._id),amount,purpose,message:"Payment submitted. Admin verification is required."});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/services",(_req,res)=>res.json({services:SERVICE_CATALOG}));

app.post("/api/services/requests",auth,async(req,res)=>{
  try{
    const service=String(req.body?.service||"").trim();
    const preferredDate=String(req.body?.preferredDate||"").trim();
    const preferredTime=String(req.body?.preferredTime||"").trim();
    const address=String(req.body?.address||"").trim();
    if(!service) return res.status(400).json({message:"Service is required"});
    if(!preferredDate || !preferredTime || !address) return res.status(400).json({message:"Address, preferred date and preferred time are required"});
    const request=await ServiceRequest.create({
      user:req.user.id, service, preferredDate, preferredTime, address,
      notes:String(req.body?.notes||"").trim()
    });
    res.status(201).json({request,message:"Service request created"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/services/requests/my",auth,async(req,res)=>{
  try{
    const requests=await ServiceRequest.find({user:req.user.id}).sort({createdAt:-1});
    res.json({requests});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/services/requests/:id/cancel",auth,async(req,res)=>{
  try{
    const request=await ServiceRequest.findOne({_id:req.params.id,user:req.user.id});
    if(!request) return res.status(404).json({message:"Service request not found"});
    if(["completed","cancelled"].includes(request.status)) return res.status(400).json({message:"This request can no longer be cancelled"});
    request.status="cancelled"; await request.save();
    res.json({request});
  }catch(e){res.status(500).json({message:e.message});}
});


// Provider marketplace: service professionals can register, view open jobs and manage jobs they accept.

app.get("/api/providers/me",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{
    const user=await User.findById(req.user.id).select("-password");
    if(!user) return res.status(404).json({message:"Provider not found"});
    const payment=await Payment.findOne({user:req.user.id,purpose:"provider_registration"}).sort({createdAt:-1});
    const jobs=(user.verificationStatus==="verified"&&user.providerToken)
      ? await ServiceRequest.find({assignedProvider:req.user.id}).sort({createdAt:-1}).limit(100).populate("user","name email phone")
      : [];
    const reviews=await Review.find({provider:req.user.id}).sort({createdAt:-1}).limit(20).populate("customer","name");
    const reviewAgg=await Review.aggregate([
      {$match:{provider:new mongoose.Types.ObjectId(req.user.id)}},
      {$group:{_id:null,average:{$avg:"$rating"},count:{$sum:1}}}
    ]);
    const completedJobs=jobs.filter(j=>j.status==="completed");
    const quotedEarnings=completedJobs.reduce((sum,j)=>sum+(Number(j.quotedPrice)||0),0);
    const openJobs=user.verificationStatus==="verified" ? await ServiceRequest.countDocuments({status:"pending",assignedProvider:null,service:{$in:PROVIDER_SERVICES}}) : 0;
    const unreadNotifications=await Notification.countDocuments({user:req.user.id,read:false});
    res.json({
      provider:user, payment:payment||null, jobs, reviews,
      stats:{totalJobs:jobs.length,completedJobs:completedJobs.length,activeJobs:jobs.filter(j=>["accepted","in_progress"].includes(j.status)).length,openJobs,quotedEarnings,averageRating:reviewAgg[0]?.average||0,reviewCount:reviewAgg[0]?.count||0,unreadNotifications}
    });
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/providers/requests",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  const me=await User.findById(req.user.id).select("verificationStatus accountStatus availability");
  if(me?.verificationStatus!=="verified") return res.status(403).json({message:"Provider account is waiting for admin verification"});
  if(me?.accountStatus!=="active") return res.status(403).json({message:"Provider account is suspended"});

  const requests=await ServiceRequest.find({
    $or:[
      {status:"pending",service:{$in:PROVIDER_SERVICES},assignedProvider:null},
      {assignedProvider:req.user.id}
    ]
  }).sort({createdAt:-1}).populate("user","name email");
  res.json({requests});
});

app.patch("/api/providers/requests/:id/accept",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  const me=await User.findById(req.user.id).select("verificationStatus accountStatus availability");
  if(me?.verificationStatus!=="verified") return res.status(403).json({message:"Provider account is waiting for admin verification"});
  if(me?.accountStatus!=="active") return res.status(403).json({message:"Provider account is suspended"});

  try{
    const request=await ServiceRequest.findOneAndUpdate(
      {_id:req.params.id,status:"pending",assignedProvider:null},
      {assignedProvider:req.user.id,status:"accepted",partnerName:req.body?.partnerName||"",partnerPhone:req.body?.partnerPhone||"",quotedPrice:req.body?.quotedPrice!==undefined&&req.body?.quotedPrice!==""?Number(req.body.quotedPrice):null},
      {new:true}
    ).populate("user","name email");
    if(!request) return res.status(409).json({message:"This request was already accepted or is no longer available"});
    await Notification.create({user:request.user,title:"Provider assigned",message:`Your ${request.service} request has been accepted by ${req.body?.partnerName||"a provider"}.`});
    res.json({request,message:"Job accepted"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/providers/requests/:id/status",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  const me=await User.findById(req.user.id).select("verificationStatus");
  if(me?.verificationStatus!=="verified") return res.status(403).json({message:"Provider account is waiting for admin verification"});
  const allowed=["accepted","in_progress","completed","cancelled"];
  const status=String(req.body?.status||"");
  if(!allowed.includes(status)) return res.status(400).json({message:"Invalid provider status"});
  try{
    const request=await ServiceRequest.findOneAndUpdate(
      {_id:req.params.id,assignedProvider:req.user.id},
      {status},
      {new:true}
    ).populate("user","name email");
    if(!request) return res.status(404).json({message:"Assigned service request not found"});
    await Notification.create({user:request.user,title:`Service ${status.replaceAll("_"," ")}`,message:`Your ${request.service} request is now ${status.replaceAll("_"," ")}.`});
    res.json({request});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/provider/notifications",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{const notifications=await Notification.find({user:req.user.id}).sort({createdAt:-1}).limit(100);res.json({notifications,unreadCount:await Notification.countDocuments({user:req.user.id,read:false})});}
  catch(e){res.status(500).json({message:e.message});}
});
app.patch("/api/provider/notifications/:id/read",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{const n=await Notification.findOneAndUpdate({_id:req.params.id,user:req.user.id},{read:true},{new:true});if(!n)return res.status(404).json({message:"Notification not found"});res.json({notification:n});}
  catch(e){res.status(500).json({message:e.message});}
});
app.patch("/api/provider/notifications/read-all",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{await Notification.updateMany({user:req.user.id,read:false},{$set:{read:true}});res.json({message:"All notifications marked as read"});}
  catch(e){res.status(500).json({message:e.message});}
});

app.put("/api/provider/profile",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{
    const provider=await User.findOne({_id:req.user.id,role:"provider"}).select("-password");
    if(!provider) return res.status(404).json({message:"Provider not found"});
    const name=String(req.body?.name||"").trim();
    const phone=String(req.body?.phone||"").trim();
    const start=String(req.body?.workingHours?.start||"09:00").trim();
    const end=String(req.body?.workingHours?.end||"18:00").trim();
    const areas=Array.isArray(req.body?.serviceAreas) ? req.body.serviceAreas.map(x=>String(x).trim()).filter(Boolean).slice(0,20) : provider.serviceAreas;
    if(name) provider.name=name;
    provider.phone=phone;
    if(/^\d{2}:\d{2}$/.test(start)&&/^\d{2}:\d{2}$/.test(end)){ provider.workingHours={start,end}; }
    provider.serviceAreas=areas;
    if(Array.isArray(req.body?.providerServices)&&req.body.providerServices.length){
      const clean=req.body.providerServices.map(x=>String(x)).filter(x=>PROVIDER_SERVICES.includes(x));
      if(clean.length) provider.providerServices=clean;
    }
    await provider.save();
    res.json({provider:await User.findById(provider._id).select("-password"),message:"Profile updated"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/provider/availability",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  const availability=String(req.body?.availability||"");
  if(!["online","offline"].includes(availability)) return res.status(400).json({message:"Availability must be online or offline"});
  const provider=await User.findOne({_id:req.user.id,role:"provider"}).select("-password");
  if(!provider) return res.status(404).json({message:"Provider not found"});
  provider.availability=availability; await provider.save();
  res.json({provider,message:`You are now ${availability}`});
});

app.post("/api/provider/change-password",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{
    const current=String(req.body?.currentPassword||"");
    const next=String(req.body?.newPassword||"");
    if(next.length<6) return res.status(400).json({message:"New password must be at least 6 characters"});
    const provider=await User.findOne({_id:req.user.id,role:"provider"});
    if(!provider) return res.status(404).json({message:"Provider not found"});
    if(!await bcrypt.compare(current,provider.password)) return res.status(401).json({message:"Current password is incorrect"});
    provider.password=await bcrypt.hash(next,12); await provider.save();
    res.json({message:"Password changed successfully. Please login again if required."});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/provider/earnings",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{
    const jobs=await ServiceRequest.find({assignedProvider:req.user.id,status:"completed"}).sort({updatedAt:-1}).limit(100).populate("user","name");
    const total=jobs.reduce((sum,j)=>sum+(Number(j.quotedPrice)||0),0);
    res.json({total, jobs});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/provider/reviews",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{
    const reviews=await Review.find({provider:req.user.id}).sort({createdAt:-1}).limit(50).populate("customer","name");
    const agg=await Review.aggregate([{$match:{provider:new mongoose.Types.ObjectId(req.user.id)}},{$group:{_id:null,average:{$avg:"$rating"},count:{$sum:1}}}]);
    res.json({reviews,average:agg[0]?.average||0,count:agg[0]?.count||0});
  }catch(e){res.status(500).json({message:e.message});}
});

app.post("/api/services/requests/:id/review",auth,async(req,res)=>{
  try{
    const rating=Number(req.body?.rating);
    if(!Number.isInteger(rating)||rating<1||rating>5) return res.status(400).json({message:"Rating must be between 1 and 5"});
    const request=await ServiceRequest.findOne({_id:req.params.id,user:req.user.id,status:"completed",assignedProvider:{$ne:null}});
    if(!request) return res.status(404).json({message:"Completed assigned service request not found"});
    if(await Review.exists({request:request._id})) return res.status(409).json({message:"Review already submitted"});
    const review=await Review.create({provider:request.assignedProvider,customer:req.user.id,request:request._id,rating,comment:String(req.body?.comment||"").trim().slice(0,1000)});
    res.status(201).json({review,message:"Review submitted"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/provider/jobs/:id/receipt",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  try{
    const job=await ServiceRequest.findOne({_id:req.params.id,assignedProvider:req.user.id,status:"completed"}).populate("user","name email phone");
    if(!job) return res.status(404).json({message:"Completed job not found"});
    res.json({receipt:{receiptNo:`SR-${new Date(job.updatedAt||Date.now()).getFullYear()}-${String(job._id).slice(-8).toUpperCase()}`,service:job.service,customer:job.user,amount:Number(job.quotedPrice)||0,completedAt:job.updatedAt,address:job.address}});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/admin/providers",adminAuth,async(req,res)=>{
  try{
    const providers=await User.find({role:"provider"}).select("-password").sort({createdAt:-1});
    res.json({providers});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/admin/providers/:id",adminAuth,async(req,res)=>{
  try{
    const status=String(req.body?.verificationStatus||"");
    if(!["pending","verified","rejected"].includes(status)) return res.status(400).json({message:"Invalid verification status"});

    const provider=await User.findOne({_id:req.params.id,role:"provider"});
    if(!provider) return res.status(404).json({message:"Provider not found"});

    if(status==="verified"){
      const paid=await Payment.findOne({user:provider._id,purpose:"provider_registration",amount:PROVIDER_REGISTRATION_FEE,status:"verified"});
      if(!paid) return res.status(400).json({message:"Verify the ₹199 provider registration payment before approving this provider"});
      if(!provider.providerToken){
        let candidate;
        do { candidate=String(crypto.randomInt(1000,10000)); }
        while(await User.exists({providerToken:candidate}));
        provider.providerToken=candidate;
      }
    }else if(status==="rejected"){
      // Keep the token so the provider can retry after admin changes the status.
    }

    provider.verificationStatus=status;
    await provider.save();

    const safe=await User.findById(provider._id).select("-password");
    res.json({provider:safe,message:`Provider ${status}`});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/admin/providers/:id/status",adminAuth,async(req,res)=>{
  try{
    const status=String(req.body?.accountStatus||"");
    if(!["active","suspended"].includes(status)) return res.status(400).json({message:"Invalid account status"});
    const provider=await User.findOne({_id:req.params.id,role:"provider"});
    if(!provider) return res.status(404).json({message:"Provider not found"});
    provider.accountStatus=status;
    provider.suspensionReason=status==="suspended" ? String(req.body?.reason||"").trim() : "";
    await provider.save();
    res.json({provider:await User.findById(provider._id).select("-password"),message:`Provider ${status}`});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/admin/services/requests",adminAuth,async(req,res)=>{
  try{
    const requests=await ServiceRequest.find().sort({createdAt:-1}).populate("user","name email");
    res.json({requests});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/admin/services/requests/:id",adminAuth,async(req,res)=>{
  try{
    const allowed=["pending","accepted","in_progress","completed","cancelled"];
    const status=String(req.body?.status||"");
    if(!allowed.includes(status)) return res.status(400).json({message:"Invalid service status"});
    const update={status,partnerName:req.body?.partnerName,partnerPhone:req.body?.partnerPhone};
    if(req.body?.assignedProvider) update.assignedProvider=req.body.assignedProvider;
    if(req.body?.quotedPrice!==undefined) update.quotedPrice=req.body.quotedPrice===""?null:Number(req.body.quotedPrice);
    const request=await ServiceRequest.findByIdAndUpdate(req.params.id,update,{new:true}).populate("user","name email").populate("assignedProvider","name email");
    if(!request) return res.status(404).json({message:"Service request not found"});
    res.json({request});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/admin/payments",adminAuth,async(req,res)=>{
  try{
    const requestedStatus=String(req.query?.status||"submitted");
    const paymentFilter={purpose:{$in:["property_upload","provider_registration","booking"]}};
    if(requestedStatus!=="all") paymentFilter.status=requestedStatus;
    const payments=await Payment.find(paymentFilter).sort({createdAt:-1}).populate("user","name email role phone providerServices ownerToken providerToken").populate("booking","receiptNo property moveInDate");
    res.json({payments});
  }catch(e){res.status(500).json({message:e.message});}
});
app.patch("/api/admin/payments/:id",adminAuth,async(req,res)=>{
  try{
    const status=String(req.body?.status||"");
    if(!["verified","rejected"].includes(status)) return res.status(400).json({message:"Status must be verified or rejected"});

    const payment=await Payment.findById(req.params.id);
    if(!payment) return res.status(404).json({message:"Payment not found"});

    payment.status=status;
    if(status==="verified"){
      payment.receiptNo=`PAY-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    }
    await payment.save();

    if(payment.purpose==="property_upload"){
      await Notification.create({user:payment.user,title:status==="verified"?"Property upload payment verified":"Property upload payment rejected",message:status==="verified"?"Your ₹199 property-upload payment is verified. You can now publish your property using the verified payment.":"Your ₹199 property-upload payment was rejected. Please submit a new payment."});
    }

    if(payment.purpose==="provider_registration"){
      await Notification.create({user:payment.user,title:status==="verified"?"Provider payment verified":"Provider payment rejected",message:status==="verified"?"Your ₹199 provider-registration payment is verified. Admin can now review your provider account.":"Your ₹199 provider-registration payment was rejected. Please submit a new payment."});
    }

    if(payment.purpose==="booking" && payment.booking){
      const booking=await Booking.findById(payment.booking);
      if(booking){
        booking.paymentStatus=status;
        booking.paymentId=payment._id;
        booking.receiptNo=booking.receiptNo||payment.receiptNo;
        await booking.save();
      }
    }

    const populated=await Payment.findById(payment._id)
      .populate("user","name email role phone providerServices providerToken")
      .populate("booking");

    res.json({payment:populated});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/bookings/:id/receipt",auth,async(req,res)=>{
  try{ const booking=await Booking.findOne({_id:req.params.id,user:req.user.id}).populate("property").populate("user","name email");
    if(!booking) return res.status(404).json({message:"Booking not found"});
    if(booking.paymentStatus!=="verified") return res.status(403).json({message:"Receipt is available after admin verifies the booking payment"});
    const payment=await Payment.findOne({booking:booking._id,status:"verified"});
    res.json({receipt:{receiptNo:booking.receiptNo||payment?.receiptNo,bookingId:booking._id,customer:booking.user,property:booking.property,moveInDate:booking.moveInDate,amount:payment?.amount||BOOKING_FEE,transactionId:payment?.transactionId||"",verifiedAt:payment?.updatedAt}});
  }catch(e){res.status(500).json({message:e.message});}
});

async function requireSubmittedUploadPayment(userId, transactionId){
  const payment=await Payment.findOne({user:userId,transactionId,purpose:"property_upload",amount:PROPERTY_UPLOAD_FEE,status:"verified",usedAt:null});
  if(!payment) throw new Error("Payment is pending admin verification. You cannot upload the property yet.");
  return payment;
}

app.post("/api/properties",auth,async(req,res)=>{
  try{
    if(req.user.role!=="owner") return res.status(403).json({message:"Only owners can add properties"});
    const {title,state,city,area,location,rent,type,description,image,images,contact,latitude,longitude,transactionId,roomType,occupancy,totalRooms,availableRooms,gender,furnished,food,attachedBathroom,securityDeposit,amenities,bhk,bathrooms,balconies,areaSqft,floor,totalFloors,facing,propertyAge,preferredTenants,maintenance,parking,lift,powerBackup,houseType,waterSupply,terrace,gatedCommunity,petFriendly,foodPlan,curfew,laundry,housekeeping,bedCount,privateEntrance,rules}=req.body;
    if(!title || rent===undefined) return res.status(400).json({message:"Title and rent are required"});
    const allowedTypes=["Flat","House","PG","Room","Commercial"];
    if(!allowedTypes.includes(String(type||""))) return res.status(400).json({message:"Select a valid property type"});
    if(!city || !area && !location) return res.status(400).json({message:"City and locality are required"});
    const payment=await requireSubmittedUploadPayment(req.user.id,transactionId);
    const property=await Property.create({title,state,city,area:area||location,location:location||area,rent:Number(rent),type,description,image,images:Array.isArray(images)?images.slice(0,8):[],contact,latitude:latitude!==undefined&&latitude!==""?Number(latitude):undefined,longitude:longitude!==undefined&&longitude!==""?Number(longitude):undefined,owner:req.user.id,roomType:String(roomType||""),occupancy:occupancy===""||occupancy==null?undefined:Number(occupancy),totalRooms:totalRooms===""||totalRooms==null?undefined:Number(totalRooms),availableRooms:availableRooms===""||availableRooms==null?undefined:Number(availableRooms),gender:String(gender||""),furnished:String(furnished||""),food:String(food||""),attachedBathroom:Boolean(attachedBathroom),securityDeposit:securityDeposit===""||securityDeposit==null?undefined:Number(securityDeposit),amenities:Array.isArray(amenities)?amenities.slice(0,30):[],bhk:bhk===""||bhk==null?undefined:Number(bhk),bathrooms:bathrooms===""||bathrooms==null?undefined:Number(bathrooms),balconies:balconies===""||balconies==null?undefined:Number(balconies),areaSqft:areaSqft===""||areaSqft==null?undefined:Number(areaSqft),floor:floor===""||floor==null?undefined:Number(floor),totalFloors:totalFloors===""||totalFloors==null?undefined:Number(totalFloors),facing:String(facing||""),propertyAge:String(propertyAge||""),preferredTenants:String(preferredTenants||""),maintenance:maintenance===""||maintenance==null?undefined:Number(maintenance),parking:String(parking||""),lift:Boolean(lift),powerBackup:Boolean(powerBackup),houseType:String(houseType||""),waterSupply:String(waterSupply||""),terrace:Boolean(terrace),gatedCommunity:Boolean(gatedCommunity),petFriendly:Boolean(petFriendly),foodPlan:String(foodPlan||""),curfew:String(curfew||""),laundry:Boolean(laundry),housekeeping:Boolean(housekeeping),bedCount:bedCount===""||bedCount==null?undefined:Number(bedCount),privateEntrance:Boolean(privateEntrance),rules:String(rules||"")});
    payment.usedAt=new Date(); await payment.save();
    res.status(201).json({property});
  }catch(e){
    const msg=String(e?.message||"Could not create property");
    res.status(msg.includes("pending admin verification")||msg.includes("₹199")?403:500).json({message:msg});
  }
});

app.put("/api/properties/:id",auth,async(req,res)=>{
  try {
    const p=await Property.findById(req.params.id);
    if(!p) return res.status(404).json({message:"Property not found"});
    if(String(p.owner)!==req.user.id) return res.status(403).json({message:"Not allowed"});

    // Owners may edit their listing, but cannot transfer ownership through this endpoint.
    const allowed=["title","state","city","area","location","rent","type","description","image","images","contact","latitude","longitude","available","roomType","occupancy","totalRooms","availableRooms","gender","furnished","food","attachedBathroom","securityDeposit","amenities","bhk","bathrooms","balconies","areaSqft","floor","totalFloors","facing","propertyAge","preferredTenants","maintenance","parking","lift","powerBackup","houseType","waterSupply","terrace","gatedCommunity","petFriendly","foodPlan","curfew","laundry","housekeeping","bedCount","privateEntrance","rules"];
    for(const key of allowed){
      if(Object.prototype.hasOwnProperty.call(req.body,key)){
        if(key==="rent") {
          const value=Number(req.body[key]);
          if(!Number.isFinite(value)||value<0) return res.status(400).json({message:"Rent must be a valid non-negative number"});
          p.rent=value;
        } else if(["occupancy","totalRooms","availableRooms","securityDeposit","bhk","bathrooms","balconies","areaSqft","floor","totalFloors","maintenance"].includes(key)) {
          const value=req.body[key];
          p[key]=value===""||value===null||value===undefined?undefined:Number(value);
        } else if(key==="amenities") {
          p.amenities=Array.isArray(req.body[key])?req.body[key].slice(0,30):p.amenities;
        } else if(key==="images") {
          p.images=Array.isArray(req.body[key])?req.body[key].slice(0,8):p.images;
        } else if(["latitude","longitude"].includes(key)) {
          p[key]=req.body[key]===""||req.body[key]===null?undefined:Number(req.body[key]);
        } else { p[key]=req.body[key]; }
      }
    }
    await p.save();
    res.json({property:p});
  } catch(e) { res.status(500).json({message:e.message}); }
});

app.delete("/api/properties/:id",auth,async(req,res)=>{
  const p=await Property.findById(req.params.id);
  if(!p) return res.status(404).json({message:"Property not found"});
  if(String(p.owner)!==req.user.id) return res.status(403).json({message:"Not allowed"});
  await p.deleteOne(); res.json({message:"Property deleted"});
});

app.post("/api/bookings",auth,async(req,res)=>{
 try{
  if(req.user.role!=="customer") return res.status(403).json({message:"Only customer accounts can request a booking"});
  const {property,moveInDate}=req.body; const p=await Property.findById(property);
  if(!p) return res.status(404).json({message:"Property not found"}); if(p.available===false) return res.status(409).json({message:"This property is currently unavailable"});
  const existing=await Booking.findOne({property,user:req.user.id,status:{$in:["pending","confirmed"]}}); if(existing) return res.status(409).json({message:"You already have an active booking request for this property"});
  const booking=await Booking.create({property,user:req.user.id,moveInDate:String(moveInDate||""),paymentStatus:"pending",receiptNo:`HR-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`});
  await booking.populate("property");
   await Notification.create({user:req.user.id,title:"Booking request created",message:`Your booking request for ${booking.property?.title||"the property"} has been created. Please complete the ₹${BOOKING_FEE} payment for verification.`});
   res.status(201).json({booking,requiresPayment:true,amount:BOOKING_FEE,message:"Booking created. Complete UPI payment and submit the transaction ID for admin verification."});
 }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/bookings/my",auth,async(req,res)=>{
  const bookings=await Booking.find({user:req.user.id}).populate("property");
  res.json({bookings});
});

app.patch("/api/bookings/:id/cancel",auth,async(req,res)=>{
  try{
    const booking=await Booking.findOne({_id:req.params.id,user:req.user.id});
    if(!booking) return res.status(404).json({message:"Booking not found"});
    if(booking.status!=="pending") return res.status(400).json({message:"Only pending booking requests can be cancelled"});
    booking.status="cancelled";
    await booking.save();
    res.json({booking,message:"Booking request cancelled"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/bookings/owner",auth,async(req,res)=>{
  if(req.user.role!=="owner") return res.status(403).json({message:"Owner access required"});
  const properties=await Property.find({owner:req.user.id}).select("_id");
  const ids=properties.map(x=>x._id);
  const bookings=await Booking.find({property:{$in:ids}}).populate("property").populate("user","name email");
  res.json({bookings});
});

app.patch("/api/bookings/:id/status",auth,async(req,res)=>{
  const booking=await Booking.findById(req.params.id).populate("property");
  if(!booking) return res.status(404).json({message:"Booking not found"});
  if(String(booking.property.owner)!==req.user.id) return res.status(403).json({message:"Not allowed"});
  const nextStatus=String(req.body?.status||"");
  if(!["confirmed","cancelled","pending"].includes(nextStatus)) return res.status(400).json({message:"Invalid booking status"});
  if(nextStatus==="confirmed" && booking.paymentStatus!=="verified") return res.status(400).json({message:"Booking payment must be verified by admin before confirmation"});
  booking.status=nextStatus; await booking.save();
  res.json({booking});
});

async function start(){
  // Start HTTP first so Render can reach the service even while MongoDB is connecting.
  app.listen(PORT, "0.0.0.0", () => console.log(`HavenRent API running on ${PORT}`));

  if(!MONGO_URI){
    console.warn("MONGO_URI missing: authentication and database features require MongoDB Atlas.");
    return;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log("MongoDB connected");
  } catch (e) {
    console.error("MongoDB connection failed:", e.message);
  }
}
start();
