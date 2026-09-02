
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const PROPERTY_UPLOAD_FEE = 250;
const PAYMENT_UPI_ID = process.env.PAYMENT_UPI_ID || "9553473078-4@ybl";
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const allowedOrigins = [
  "https://haverent.in/admin",
  "https://haverent.in",
  "https://nethouse.in",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/.*\.netlify\.app$/.test(origin)) {
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
  role: { type: String, enum: ["customer","owner","provider"], default: "customer" }
}, { timestamps: true });

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  city: String,
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
  powerBackup: { type: Boolean, default: false }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending","confirmed","cancelled"], default: "pending" },
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
  purpose: { type: String, default: "property_upload" }
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
    if(await User.findOne({email:email.toLowerCase()})) return res.status(409).json({message:"Email already registered"});
    const hash=await bcrypt.hash(password,12);
    const safeRole = ["customer","owner","provider"].includes(String(role).toLowerCase()) ? String(role).toLowerCase() : "customer";
    const user=await User.create({name,email:email.toLowerCase(),password:hash,role:safeRole});
    res.status(201).json({token:tokenFor(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  }catch(e){res.status(500).json({message:e.message});}
});

app.post(["/api/auth/login", "/api/login"], async (req,res)=>{
  if (mongoose.connection.readyState !== 1) return res.status(503).json({message:"Database is not connected. Please check MongoDB Atlas settings in Render."});
  try{
    const {email,password}=req.body;
    const user=await User.findOne({email:email?.toLowerCase()});
    if(!user || !(await bcrypt.compare(password||"",user.password))) return res.status(401).json({message:"Invalid email or password"});
    res.json({token:tokenFor(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/auth/me",auth,async(req,res)=>{
  const user=await User.findById(req.user.id).select("-password");
  if(!user) return res.status(404).json({message:"User not found"});
  res.json({user});
});

const demoProperties = [
  { _id:"demo-1", title:"Modern Luxury Apartment", city:"Visakhapatnam", location:"Visakhapatnam, Andhra Pradesh", rent:14500, type:"Flat", description:"A modern apartment for comfortable everyday living.", image:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80" },
  { _id:"demo-2", title:"Cozy City Home", city:"Hyderabad", location:"Hyderabad, Telangana", rent:12000, type:"House", description:"A bright and comfortable rental home.", image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" }
];

app.get("/api/properties",async(req,res)=>{
  try{
    const q={};
    if(req.query.city) q.city=new RegExp(req.query.city,"i");
    if(req.query.type) q.type=req.query.type;
    if(req.query.maxRent) q.rent={$lte:Number(req.query.maxRent)};
    if(!MONGO_URI) return res.json({properties:demoProperties});
    const properties=await Property.find(q).sort({createdAt:-1}).populate("owner","name email");
    res.json({properties});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/properties/:id",async(req,res)=>{
  try{
    const p=await Property.findById(req.params.id).populate("owner","name email");
    if(!p) return res.status(404).json({message:"Property not found"});
    res.json({property:p});
  }catch(e){res.status(400).json({message:"Invalid property id"});}
});

app.get("/api/payments/config", async (_req,res) => {
  res.json({ enabled: true, method: "UPI", upiId: PAYMENT_UPI_ID, amount: PROPERTY_UPLOAD_FEE, currency: "INR" });
});

app.get("/api/payments/my",auth,async(req,res)=>{
  try{
    const payments=await Payment.find({user:req.user.id,purpose:"property_upload"}).sort({createdAt:-1}).limit(20);
    res.json({payments});
  }catch(e){res.status(500).json({message:e.message});}
});

app.post("/api/payments/manual/submit", auth, async (req,res) => {
  try {
    if (req.user.role !== "owner") return res.status(403).json({message:"Only owners can submit the property upload payment"});
    const transactionId = String(req.body?.transactionId || "").trim();
    if (!transactionId) return res.status(400).json({message:"UPI transaction ID is required"});
    if (transactionId.length < 6 || transactionId.length > 100) return res.status(400).json({message:"Please enter a valid UPI transaction ID"});
    const existing = await Payment.findOne({transactionId});
    if (existing) return res.status(409).json({message:"This transaction ID has already been submitted"});
    const payment = await Payment.create({
      user:req.user.id,
      orderId:`manual_${req.user.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      transactionId,
      amount:PROPERTY_UPLOAD_FEE,
      currency:"INR",
      status:"submitted"
    });
    res.status(201).json({
      submitted:true,
      paymentId:payment._id.toString(),
      transactionId,
      amount:PROPERTY_UPLOAD_FEE,
      status:"submitted",
      message:"Payment details submitted. HavenRent can verify the UPI transaction manually."
    });
  } catch(e) {
    if (e?.code === 11000) return res.status(409).json({message:"This transaction ID has already been submitted"});
    res.status(500).json({message:e.message});
  }
});

// Manual UPI flow: the server records the transaction ID and unlocks listing upload.
// Actual bank/UPI confirmation is not available without a payment-gateway/bank API.
async function requireSubmittedUploadPayment(userId, transactionId){
  if(!transactionId) throw new Error("A ₹250 UPI payment and transaction ID are required before uploading a property");
  const record = await Payment.findOne({
    user:userId,
    transactionId:String(transactionId).trim(),
    amount:PROPERTY_UPLOAD_FEE,
    status:"verified"
  });
  if(!record) throw new Error("Payment is pending admin verification. You cannot upload the property yet.");
  return record;
}

const SERVICE_CATALOG = [
  {slug:"home-repairs",name:"Home Repairs",startingPrice:199},
  {slug:"move-shift",name:"Move & Shift",startingPrice:999},
  {slug:"home-cleaning",name:"Home Cleaning",startingPrice:499},
  {slug:"rental-agreement",name:"Rental Agreement",startingPrice:299},
  {slug:"tenant-verification",name:"Tenant Verification",startingPrice:149},
  {slug:"rent-management",name:"Rent Management",startingPrice:null}
];
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
const PROVIDER_SERVICES = ["Home Repairs","Move & Shift","Home Cleaning","Rental Agreement","Tenant Verification"];

app.get("/api/providers/me",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
  const user=await User.findById(req.user.id).select("-password");
  if(!user) return res.status(404).json({message:"Provider not found"});
  const jobs=await ServiceRequest.find({assignedProvider:req.user.id}).sort({createdAt:-1}).limit(50).populate("user","name email");
  res.json({provider:user,jobs});
});

app.get("/api/providers/requests",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
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
  try{
    const request=await ServiceRequest.findOneAndUpdate(
      {_id:req.params.id,status:"pending",assignedProvider:null},
      {assignedProvider:req.user.id,status:"accepted",partnerName:req.body?.partnerName||"",partnerPhone:req.body?.partnerPhone||"",quotedPrice:req.body?.quotedPrice!==undefined&&req.body?.quotedPrice!==""?Number(req.body.quotedPrice):null},
      {new:true}
    ).populate("user","name email");
    if(!request) return res.status(409).json({message:"This request was already accepted or is no longer available"});
    res.json({request,message:"Job accepted"});
  }catch(e){res.status(500).json({message:e.message});}
});

app.patch("/api/providers/requests/:id/status",auth,async(req,res)=>{
  if(req.user.role!=="provider") return res.status(403).json({message:"Provider account required"});
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
    res.json({request});
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
    const payments=await Payment.find({status:"submitted"}).sort({createdAt:-1}).populate("user","name email");
    res.json({payments});
  }catch(e){res.status(500).json({message:e.message});}
});
app.patch("/api/admin/payments/:id",adminAuth,async(req,res)=>{
  try{
    const status=String(req.body?.status||"");
    if(!["verified","rejected"].includes(status)) return res.status(400).json({message:"Status must be verified or rejected"});
    const payment=await Payment.findByIdAndUpdate(req.params.id,{status},{new:true}).populate("user","name email");
    if(!payment) return res.status(404).json({message:"Payment not found"});
    res.json({payment});
  }catch(e){res.status(500).json({message:e.message});}
});

app.post("/api/properties",auth,async(req,res)=>{
  try{
    if(req.user.role!=="owner") return res.status(403).json({message:"Only owners can add properties"});
    const {title,city,location,rent,type,description,image,images,contact,latitude,longitude,transactionId,roomType,occupancy,totalRooms,availableRooms,gender,furnished,food,attachedBathroom,securityDeposit,amenities,bhk,bathrooms,balconies,areaSqft,floor,totalFloors,facing,propertyAge,preferredTenants,maintenance,parking,lift,powerBackup}=req.body;
    if(!title || rent===undefined) return res.status(400).json({message:"Title and rent are required"});
    await requireSubmittedUploadPayment(req.user.id,transactionId);
    const property=await Property.create({title,city,location,rent:Number(rent),type,description,image,images:Array.isArray(images)?images.slice(0,8):[],contact,latitude:latitude!==undefined&&latitude!==""?Number(latitude):undefined,longitude:longitude!==undefined&&longitude!==""?Number(longitude):undefined,owner:req.user.id,roomType:String(roomType||""),occupancy:occupancy===""||occupancy==null?undefined:Number(occupancy),totalRooms:totalRooms===""||totalRooms==null?undefined:Number(totalRooms),availableRooms:availableRooms===""||availableRooms==null?undefined:Number(availableRooms),gender:String(gender||""),furnished:String(furnished||""),food:String(food||""),attachedBathroom:Boolean(attachedBathroom),securityDeposit:securityDeposit===""||securityDeposit==null?undefined:Number(securityDeposit),amenities:Array.isArray(amenities)?amenities.slice(0,30):[],bhk:bhk===""||bhk==null?undefined:Number(bhk),bathrooms:bathrooms===""||bathrooms==null?undefined:Number(bathrooms),balconies:balconies===""||balconies==null?undefined:Number(balconies),areaSqft:areaSqft===""||areaSqft==null?undefined:Number(areaSqft),floor:floor===""||floor==null?undefined:Number(floor),totalFloors:totalFloors===""||totalFloors==null?undefined:Number(totalFloors),facing:String(facing||""),propertyAge:String(propertyAge||""),preferredTenants:String(preferredTenants||""),maintenance:maintenance===""||maintenance==null?undefined:Number(maintenance),parking:String(parking||""),lift:Boolean(lift),powerBackup:Boolean(powerBackup)});
    res.status(201).json({property});
  }catch(e){
    const msg=String(e?.message||"Could not create property");
    res.status(msg.includes("pending admin verification")||msg.includes("₹250")?403:500).json({message:msg});
  }
});

app.put("/api/properties/:id",auth,async(req,res)=>{
  try {
    const p=await Property.findById(req.params.id);
    if(!p) return res.status(404).json({message:"Property not found"});
    if(String(p.owner)!==req.user.id) return res.status(403).json({message:"Not allowed"});

    // Owners may edit their listing, but cannot transfer ownership through this endpoint.
    const allowed=["title","city","location","rent","type","description","image","images","contact","latitude","longitude","available","roomType","occupancy","totalRooms","availableRooms","gender","furnished","food","attachedBathroom","securityDeposit","amenities","bhk","bathrooms","balconies","areaSqft","floor","totalFloors","facing","propertyAge","preferredTenants","maintenance","parking","lift","powerBackup"];
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
    const {property,moveInDate}=req.body;
    const p=await Property.findById(property);
    if(!p) return res.status(404).json({message:"Property not found"});
    if(p.available===false) return res.status(409).json({message:"This property is currently unavailable"});
    const existing=await Booking.findOne({property,user:req.user.id,status:{$in:["pending","confirmed"]}});
    if(existing) return res.status(409).json({message:"You already have an active booking request for this property"});
    const booking=await Booking.create({property,user:req.user.id,moveInDate:String(moveInDate||"")});
    await booking.populate("property");
    res.status(201).json({booking,message:"Booking request sent to the owner"});
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
  booking.status=req.body.status; await booking.save();
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
