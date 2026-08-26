
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

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer","owner"], default: "customer" }
}, { timestamps: true });

const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  city: String,
  location: String,
  rent: { type: Number, required: true },
  type: { type: String, default: "Flat" },
  description: String,
  image: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  available: { type: Boolean, default: true }
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

app.get("/", (_,res)=>res.json({name:"HavenRent API",status:"online"}));
app.get("/api/health", (_,res)=>res.json({ok:true}));

app.post("/api/auth/register", async (req,res)=>{
  try{
    const {name,email,password,role="customer"}=req.body;
    if(!name || !email || !password) return res.status(400).json({message:"Name, email and password are required"});
    if(await User.findOne({email:email.toLowerCase()})) return res.status(409).json({message:"Email already registered"});
    const hash=await bcrypt.hash(password,12);
    const user=await User.create({name,email:email.toLowerCase(),password:hash,role:role==="owner"?"owner":"customer"});
    res.status(201).json({token:tokenFor(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  }catch(e){res.status(500).json({message:e.message});}
});

app.post("/api/auth/login", async (req,res)=>{
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

app.post("/api/properties",auth,async(req,res)=>{
  try{
    if(req.user.role!=="owner") return res.status(403).json({message:"Only owners can add properties"});
    const {title,city,location,rent,type,description,image}=req.body;
    if(!title || rent===undefined) return res.status(400).json({message:"Title and rent are required"});
    const property=await Property.create({title,city,location,rent:Number(rent),type,description,image,owner:req.user.id});
    res.status(201).json({property});
  }catch(e){res.status(500).json({message:e.message});}
});

app.put("/api/properties/:id",auth,async(req,res)=>{
  const p=await Property.findById(req.params.id);
  if(!p) return res.status(404).json({message:"Property not found"});
  if(String(p.owner)!==req.user.id) return res.status(403).json({message:"Not allowed"});
  Object.assign(p,req.body); await p.save(); res.json({property:p});
});

app.delete("/api/properties/:id",auth,async(req,res)=>{
  const p=await Property.findById(req.params.id);
  if(!p) return res.status(404).json({message:"Property not found"});
  if(String(p.owner)!==req.user.id) return res.status(403).json({message:"Not allowed"});
  await p.deleteOne(); res.json({message:"Property deleted"});
});

app.post("/api/bookings",auth,async(req,res)=>{
  try{
    const {property,moveInDate}=req.body;
    const p=await Property.findById(property);
    if(!p) return res.status(404).json({message:"Property not found"});
    const booking=await Booking.create({property,user:req.user.id,moveInDate});
    res.status(201).json({booking});
  }catch(e){res.status(500).json({message:e.message});}
});

app.get("/api/bookings/my",auth,async(req,res)=>{
  const bookings=await Booking.find({user:req.user.id}).populate("property");
  res.json({bookings});
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
  if(MONGO_URI){
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
  } else {
    console.warn("MONGO_URI missing: database routes will not work until MongoDB is configured.");
  }
  app.listen(PORT,()=>console.log(`HavenRent API running on ${PORT}`));
}
start().catch(e=>{console.error(e);process.exit(1);});
