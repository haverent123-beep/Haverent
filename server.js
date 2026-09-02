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

const PAYMENT_UPI_ID =
  process.env.PAYMENT_UPI_ID || "9553473078-4@ybl";

const BOOKING_PAYMENT_AMOUNT = Number(
  process.env.BOOKING_PAYMENT_AMOUNT || 0
);

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || ""
)
  .toLowerCase()
  .trim();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

/* =========================
   CORS
========================= */

const allowedOrigins = [
  "https://haverent.in",
  "https://www.haverent.in",
  "https://nethouse.in"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept"
    ]
  })
);

app.options(/.*/, cors());

app.use(
  express.json({
    limit: "15mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

/* =========================
   USER SCHEMA
========================= */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["customer", "owner", "provider"],
      default: "customer"
    },

    /* Provider verification */

    verificationStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "approved",
        "rejected"
      ],
      default: "not_required"
    },

    verificationNote: {
      type: String,
      default: ""
    },

    providerServices: {
      type: [String],
      default: []
    },

    phone: {
      type: String,
      default: ""
    },

    documentUrl: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   PROPERTY SCHEMA
========================= */

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    city: String,

    location: String,

    rent: {
      type: Number,
      required: true
    },

    type: {
      type: String,
      default: "Flat"
    },

    description: String,

    image: String,

    images: {
      type: [String],
      default: []
    },

    contact: String,

    latitude: Number,

    longitude: Number,

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    available: {
      type: Boolean,
      default: true
    },

    /* Room / PG */

    roomType: {
      type: String,
      default: ""
    },

    occupancy: {
      type: Number,
      default: null
    },

    totalRooms: {
      type: Number,
      default: null
    },

    availableRooms: {
      type: Number,
      default: null
    },

    gender: {
      type: String,
      default: ""
    },

    furnished: {
      type: String,
      default: ""
    },

    food: {
      type: String,
      default: ""
    },

    attachedBathroom: {
      type: Boolean,
      default: false
    },

    securityDeposit: {
      type: Number,
      default: null
    },

    amenities: {
      type: [String],
      default: []
    },

    /* Flat */

    bhk: {
      type: Number,
      default: null
    },

    bathrooms: {
      type: Number,
      default: null
    },

    balconies: {
      type: Number,
      default: null
    },

    areaSqft: {
      type: Number,
      default: null
    },

    floor: {
      type: Number,
      default: null
    },

    totalFloors: {
      type: Number,
      default: null
    },

    facing: {
      type: String,
      default: ""
    },

    propertyAge: {
      type: String,
      default: ""
    },

    preferredTenants: {
      type: String,
      default: ""
    },

    maintenance: {
      type: Number,
      default: null
    },

    parking: {
      type: String,
      default: ""
    },

    lift: {
      type: Boolean,
      default: false
    },

    powerBackup: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   BOOKING SCHEMA
========================= */

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled"
      ],
      default: "pending"
    },

    moveInDate: String,

    /* Booking payment */

    paymentRequired: {
      type: Boolean,
      default: false
    },

    paymentStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "submitted",
        "verified",
        "rejected"
      ],
      default: "not_required"
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null
    },

    paymentAmount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   MODELS
========================= */

const User = mongoose.model(
  "User",
  userSchema
);

const Property = mongoose.model(
  "Property",
  propertySchema
);

const Booking = mongoose.model(
  "Booking",
  bookingSchema
);

/* =========================
   PAYMENT SCHEMA
========================= */

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },

    orderId: {
      type: String,
      required: true,
      unique: true
    },

    transactionId: {
      type: String,
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    currency: {
      type: String,
      default: "INR"
    },

    status: {
      type: String,
      enum: [
        "submitted",
        "verified",
        "rejected"
      ],
      default: "submitted"
    },

    purpose: {
      type: String,
      enum: [
        "property_upload",
        "booking"
      ],
      default: "property_upload"
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index(
  { transactionId: 1 },
  { unique: true }
);

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);
/* =========================
   SERVICE REQUEST SCHEMA
========================= */

const serviceRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    service: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled"
      ],
      default: "pending"
    },

    preferredDate: String,
    preferredTime: String,
    address: String,
    notes: String,

    partnerName: String,
    partnerPhone: String,

    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    quotedPrice: {
      type: Number,
      default: null
    },

    providerNote: String
  },
  {
    timestamps: true
  }
);

const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);


/* =========================
   AUTH FUNCTIONS
========================= */

function tokenFor(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}


function auth(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  try {
    req.user = jwt.verify(
      token,
      JWT_SECRET
    );

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}


/* =========================
   ADMIN AUTH
========================= */

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    next();
  });
}


/* =========================
   PROVIDER APPROVAL
========================= */

async function providerApproved(
  req,
  res,
  next
) {
  if (req.user?.role !== "provider") {
    return res.status(403).json({
      message: "Provider account required"
    });
  }

  try {
    const user = await User.findById(
      req.user.id
    ).select(
      "verificationStatus"
    );

    if (!user) {
      return res.status(404).json({
        message: "Provider not found"
      });
    }

    if (
      user.verificationStatus !==
      "approved"
    ) {
      return res.status(403).json({
        message:
          `Provider account is ${user.verificationStatus}. Admin approval is required.`
      });
    }

    next();
  } catch {
    return res.status(500).json({
      message:
        "Could not verify provider status"
    });
  }
}


/* =========================
   ADMIN LOGIN
========================= */

app.post(
  "/api/admin/login",
  (req, res) => {
    const email = String(
      req.body?.email || ""
    )
      .toLowerCase()
      .trim();

    const password = String(
      req.body?.password || ""
    );

    if (
      !ADMIN_EMAIL ||
      !ADMIN_PASSWORD
    ) {
      return res.status(503).json({
        message:
          "Admin credentials are not configured on the backend"
      });
    }

    if (
      email !== ADMIN_EMAIL ||
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        message:
          "Invalid admin credentials"
      });
    }

    const token = jwt.sign(
      {
        id: "admin",
        role: "admin",
        email: ADMIN_EMAIL
      },
      JWT_SECRET,
      {
        expiresIn: "12h"
      }
    );

    res.json({
      token,
      user: {
        id: "admin",
        email: ADMIN_EMAIL,
        role: "admin",
        name: "HavenRent Admin"
      }
    });
  }
);


/* =========================
   BASIC ROUTES
========================= */

app.get(
  "/",
  (_req, res) => {
    res.json({
      name: "HavenRent API",
      status: "online"
    });
  }
);


app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      ok: true,
      service: "HavenRent API",
      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected"
    });
  }
);


/* =========================
   REGISTER
========================= */

app.post(
  [
    "/api/auth/register",
    "/api/register"
  ],
  async (req, res) => {
    if (
      mongoose.connection.readyState !== 1
    ) {
      return res.status(503).json({
        message:
          "Database is not connected. Please check MongoDB Atlas settings in Render."
      });
    }

    try {
      const {
        name,
        email,
        password,
        role = "customer",
        phone = "",
        providerServices = [],
        documentUrl = ""
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Name, email and password are required"
        });
      }

      const normalizedEmail =
        String(email)
          .toLowerCase()
          .trim();

      const existing =
        await User.findOne({
          email: normalizedEmail
        });

      if (existing) {
        return res.status(409).json({
          message:
            "Email already registered"
        });
      }

      const safeRole = [
        "customer",
        "owner",
        "provider"
      ].includes(
        String(role).toLowerCase()
      )
        ? String(role).toLowerCase()
        : "customer";

      const hash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await User.create({
          name: String(name).trim(),
          email: normalizedEmail,
          password: hash,
          role: safeRole,

          verificationStatus:
            safeRole === "provider"
              ? "pending"
              : "not_required",

          phone: String(phone || "").trim(),

          providerServices:
            safeRole === "provider" &&
            Array.isArray(providerServices)
              ? providerServices
              : [],

          documentUrl:
            String(documentUrl || "").trim()
        });

      res.status(201).json({
        token: tokenFor(user),

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationStatus:
            user.verificationStatus,
          providerServices:
            user.providerServices,
          phone: user.phone
        },

        message:
          safeRole === "provider"
            ? "Provider registration submitted. Admin approval is required before you can accept service jobs."
            : "Registration successful"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   LOGIN
========================= */

app.post(
  [
    "/api/auth/login",
    "/api/login"
  ],
  async (req, res) => {
    if (
      mongoose.connection.readyState !== 1
    ) {
      return res.status(503).json({
        message:
          "Database is not connected. Please check MongoDB Atlas settings in Render."
      });
    }

    try {
      const email =
        String(req.body?.email || "")
          .toLowerCase()
          .trim();

      const password =
        String(req.body?.password || "");

      const user =
        await User.findOne({
          email
        });

      if (
        !user ||
        !(await bcrypt.compare(
          password,
          user.password
        ))
      ) {
        return res.status(401).json({
          message:
            "Invalid email or password"
        });
      }

      res.json({
        token: tokenFor(user),

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationStatus:
            user.verificationStatus,
          providerServices:
            user.providerServices,
          phone: user.phone
        }
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CURRENT USER
========================= */

app.get(
  "/api/auth/me",
  auth,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.id
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.json({
        user
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   ADMIN PROVIDER MANAGEMENT
========================= */

app.get(
  "/api/admin/providers",
  adminAuth,
  async (_req, res) => {
    try {
      const providers =
        await User.find({
          role: "provider"
        })
          .select("-password")
          .sort({
            createdAt: -1
          });

      res.json({
        providers
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


app.get(
  "/api/admin/providers/pending",
  adminAuth,
  async (_req, res) => {
    try {
      const providers =
        await User.find({
          role: "provider",
          verificationStatus: "pending"
        })
          .select("-password")
          .sort({
            createdAt: -1
          });

      res.json({
        providers
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


app.patch(
  "/api/admin/providers/:id/verify",
  adminAuth,
  async (req, res) => {
    try {
      const status =
        String(
          req.body?.status || ""
        ).toLowerCase();

      const note =
        String(
          req.body?.note || ""
        ).trim();

      if (
        ![
          "approved",
          "rejected",
          "pending"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Status must be approved, rejected or pending"
        });
      }

      const provider =
        await User.findOneAndUpdate(
          {
            _id: req.params.id,
            role: "provider"
          },
          {
            verificationStatus:
              status,
            verificationNote:
              note
          },
          {
            new: true
          }
        ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found"
        });
      }

      res.json({
        provider,
        message:
          `Provider ${status}`
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   APPROVE PROVIDER
========================= */

app.patch(
  "/api/admin/providers/:id/approve",
  adminAuth,
  async (req, res) => {
    try {
      const provider =
        await User.findOneAndUpdate(
          {
            _id: req.params.id,
            role: "provider"
          },
          {
            verificationStatus:
              "approved",
            verificationNote:
              String(
                req.body?.note || ""
              ).trim()
          },
          {
            new: true
          }
        ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found"
        });
      }

      res.json({
        provider,
        message:
          "Provider approved successfully"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   REJECT PROVIDER
========================= */

app.patch(
  "/api/admin/providers/:id/reject",
  adminAuth,
  async (req, res) => {
    try {
      const provider =
        await User.findOneAndUpdate(
          {
            _id: req.params.id,
            role: "provider"
          },
          {
            verificationStatus:
              "rejected",
            verificationNote:
              String(
                req.body?.note || ""
              ).trim()
          },
          {
            new: true
          }
        ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found"
        });
      }

      res.json({
        provider,
        message:
          "Provider rejected"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
      /* =========================
   DEMO PROPERTIES
========================= */

const demoProperties = [
  {
    _id: "demo-1",
    title: "Modern Luxury Apartment",
    city: "Visakhapatnam",
    location: "Visakhapatnam, Andhra Pradesh",
    rent: 14500,
    type: "Flat",
    description:
      "A modern apartment for comfortable everyday living.",
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80"
  },

  {
    _id: "demo-2",
    title: "Cozy City Home",
    city: "Hyderabad",
    location: "Hyderabad, Telangana",
    rent: 12000,
    type: "House",
    description:
      "A bright and comfortable rental home.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
  }
];


/* =========================
   PROPERTY LIST
========================= */

app.get(
  "/api/properties",
  async (req, res) => {
    try {
      const q = {};

      if (req.query.city) {
        q.city = new RegExp(
          String(req.query.city),
          "i"
        );
      }

      if (req.query.type) {
        q.type = String(req.query.type);
      }

      if (req.query.maxRent) {
        const maxRent =
          Number(req.query.maxRent);

        if (Number.isFinite(maxRent)) {
          q.rent = {
            $lte: maxRent
          };
        }
      }

      if (!MONGO_URI) {
        return res.json({
          properties: demoProperties
        });
      }

      const properties =
        await Property.find(q)
          .sort({
            createdAt: -1
          })
          .populate(
            "owner",
            "name email phone"
          );

      res.json({
        properties
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   SINGLE PROPERTY
========================= */

app.get(
  "/api/properties/:id",
  async (req, res) => {
    try {
      const property =
        await Property.findById(
          req.params.id
        ).populate(
          "owner",
          "name email phone"
        );

      if (!property) {
        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      res.json({
        property
      });
    } catch {
      res.status(400).json({
        message:
          "Invalid property id"
      });
    }
  }
);


/* =========================
   PAYMENT CONFIG
========================= */

app.get(
  "/api/payments/config",
  async (_req, res) => {
    res.json({
      enabled: true,
      method: "UPI",
      upiId: PAYMENT_UPI_ID,

      propertyUploadAmount:
        PROPERTY_UPLOAD_FEE,

      bookingPaymentAmount:
        BOOKING_PAYMENT_AMOUNT,

      currency: "INR"
    });
  }
);


/* =========================
   MY PAYMENTS
========================= */

app.get(
  "/api/payments/my",
  auth,
  async (req, res) => {
    try {
      const payments =
        await Payment.find({
          user: req.user.id
        })
          .sort({
            createdAt: -1
          })
          .limit(50)
          .populate(
            "booking",
            "property status paymentStatus paymentAmount"
          );

      res.json({
        payments
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   PROPERTY UPLOAD PAYMENT
========================= */

app.post(
  "/api/payments/manual/submit",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message:
            "Only owners can submit the property upload payment"
        });
      }

      const transactionId =
        String(
          req.body?.transactionId || ""
        ).trim();

      if (!transactionId) {
        return res.status(400).json({
          message:
            "UPI transaction ID is required"
        });
      }

      if (
        transactionId.length < 6 ||
        transactionId.length > 100
      ) {
        return res.status(400).json({
          message:
            "Please enter a valid UPI transaction ID"
        });
      }

      const existing =
        await Payment.findOne({
          transactionId
        });

      if (existing) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted"
        });
      }

      const payment =
        await Payment.create({
          user: req.user.id,

          orderId:
            `manual_${req.user.id}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          transactionId,

          amount:
            PROPERTY_UPLOAD_FEE,

          currency: "INR",

          status: "submitted",

          purpose:
            "property_upload"
        });

      res.status(201).json({
        submitted: true,

        paymentId:
          payment._id.toString(),

        transactionId,

        amount:
          PROPERTY_UPLOAD_FEE,

        status: "submitted",

        message:
          "Payment details submitted. Admin can verify the UPI transaction manually."
      });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted"
        });
      }

      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CHECK PROPERTY PAYMENT
========================= */

async function requireSubmittedUploadPayment(
  userId,
  transactionId
) {
  if (!transactionId) {
    throw new Error(
      "A ₹250 UPI payment and transaction ID are required before uploading a property"
    );
  }

  const record =
    await Payment.findOne({
      user: userId,

      transactionId:
        String(transactionId).trim(),

      amount:
        PROPERTY_UPLOAD_FEE,

      purpose:
        "property_upload",

      status: "verified"
    });

  if (!record) {
    throw new Error(
      "Payment is pending admin verification. You cannot upload the property yet."
    );
  }

  return record;
}


/* =========================
   SERVICE CATALOG
========================= */

const SERVICE_CATALOG = [
  {
    slug: "home-repairs",
    name: "Home Repairs",
    startingPrice: 199
  },

  {
    slug: "move-shift",
    name: "Move & Shift",
    startingPrice: 999
  },

  {
    slug: "home-cleaning",
    name: "Home Cleaning",
    startingPrice: 499
  },

  {
    slug: "rental-agreement",
    name: "Rental Agreement",
    startingPrice: 299
  },

  {
    slug: "tenant-verification",
    name: "Tenant Verification",
    startingPrice: 149
  },

  {
    slug: "rent-management",
    name: "Rent Management",
    startingPrice: null
  }
];


app.get(
  "/api/services",
  (_req, res) => {
    res.json({
      services:
        SERVICE_CATALOG
    });
  }
);


/* =========================
   CREATE SERVICE REQUEST
========================= */

app.post(
  "/api/services/requests",
  auth,
  async (req, res) => {
    try {
      const service =
        String(
          req.body?.service || ""
        ).trim();

      const preferredDate =
        String(
          req.body?.preferredDate || ""
        ).trim();

      const preferredTime =
        String(
          req.body?.preferredTime || ""
        ).trim();

      const address =
        String(
          req.body?.address || ""
        ).trim();

      if (!service) {
        return res.status(400).json({
          message:
            "Service is required"
        });
      }

      if (
        !preferredDate ||
        !preferredTime ||
        !address
      ) {
        return res.status(400).json({
          message:
            "Address, preferred date and preferred time are required"
        });
      }

      const request =
        await ServiceRequest.create({
          user: req.user.id,

          service,

          preferredDate,

          preferredTime,

          address,

          notes:
            String(
              req.body?.notes || ""
            ).trim()
        });

      res.status(201).json({
        request,

        message:
          "Service request created"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   MY SERVICE REQUESTS
========================= */

app.get(
  "/api/services/requests/my",
  auth,
  async (req, res) => {
    try {
      const requests =
        await ServiceRequest.find({
          user: req.user.id
        }).sort({
          createdAt: -1
        });

      res.json({
        requests
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CANCEL SERVICE REQUEST
========================= */

app.patch(
  "/api/services/requests/:id/cancel",
  auth,
  async (req, res) => {
    try {
      const request =
        await ServiceRequest.findOne({
          _id: req.params.id,
          user: req.user.id
        });

      if (!request) {
        return res.status(404).json({
          message:
            "Service request not found"
        });
      }

      if (
        [
          "completed",
          "cancelled"
        ].includes(request.status)
      ) {
        return res.status(400).json({
          message:
            "This request can no longer be cancelled"
        });
      }

      request.status =
        "cancelled";

      await request.save();

      res.json({
        request
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   PROVIDER SERVICES
========================= */

const PROVIDER_SERVICES = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification"
];


/* =========================
   PROVIDER PROFILE
========================= */

app.get(
  "/api/providers/me",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const provider =
        await User.findById(
          req.user.id
        ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found"
        });
      }

      const jobs =
        await ServiceRequest.find({
          assignedProvider:
            req.user.id
        })
          .sort({
            createdAt: -1
          })
          .limit(50)
          .populate(
            "user",
            "name email"
          );

      res.json({
        provider,
        jobs
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   PROVIDER JOBS
========================= */

app.get(
  "/api/providers/requests",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const requests =
        await ServiceRequest.find({
          $or: [
            {
              status: "pending",

              service: {
                $in:
                  PROVIDER_SERVICES
              },

              assignedProvider:
                null
            },

            {
              assignedProvider:
                req.user.id
            }
          ]
        })
          .sort({
            createdAt: -1
          })
          .populate(
            "user",
            "name email"
          );

      res.json({
        requests
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   PROVIDER ACCEPT JOB
========================= */

app.patch(
  "/api/providers/requests/:id/accept",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const request =
        await ServiceRequest.findOneAndUpdate(
          {
            _id: req.params.id,
            status: "pending",
            assignedProvider: null
          },

          {
            assignedProvider:
              req.user.id,

            status: "accepted",

            partnerName:
              String(
                req.body?.partnerName ||
                  ""
              ).trim(),

            partnerPhone:
              String(
                req.body?.partnerPhone ||
                  ""
              ).trim(),

            quotedPrice:
              req.body?.quotedPrice !==
                undefined &&
              req.body?.quotedPrice !==
                ""
                ? Number(
                    req.body.quotedPrice
                  )
                : null
          },

          {
            new: true
          }
        ).populate(
          "user",
          "name email"
        );

      if (!request) {
        return res.status(409).json({
          message:
            "This request was already accepted or is no longer available"
        });
      }

      res.json({
        request,

        message:
          "Job accepted"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   PROVIDER UPDATE STATUS
========================= */

app.patch(
  "/api/providers/requests/:id/status",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const allowed = [
        "accepted",
        "in_progress",
        "completed",
        "cancelled"
      ];

      const status =
        String(
          req.body?.status || ""
        );

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid provider status"
        });
      }

      const request =
        await ServiceRequest.findOneAndUpdate(
          {
            _id: req.params.id,

            assignedProvider:
              req.user.id
          },

          {
            status
          },

          {
            new: true
          }
        ).populate(
          "user",
          "name email"
        );

      if (!request) {
        return res.status(404).json({
          message:
            "Assigned service request not found"
        });
      }

      res.json({
        request
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
      /* =========================
   ADMIN SERVICE REQUESTS
========================= */

app.get(
  "/api/admin/services/requests",
  adminAuth,
  async (_req, res) => {
    try {
      const requests =
        await ServiceRequest.find()
          .sort({ createdAt: -1 })
          .populate("user", "name email")
          .populate(
            "assignedProvider",
            "name email phone"
          );

      res.json({ requests });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


app.patch(
  "/api/admin/services/requests/:id",
  adminAuth,
  async (req, res) => {
    try {
      const allowed = [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled"
      ];

      const status =
        String(req.body?.status || "");

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: "Invalid service status"
        });
      }

      const update = {
        status,
        partnerName:
          req.body?.partnerName,
        partnerPhone:
          req.body?.partnerPhone
      };

      if (req.body?.assignedProvider) {
        update.assignedProvider =
          req.body.assignedProvider;
      }

      if (
        req.body?.quotedPrice !==
        undefined
      ) {
        update.quotedPrice =
          req.body.quotedPrice === ""
            ? null
            : Number(
                req.body.quotedPrice
              );
      }

      const request =
        await ServiceRequest.findByIdAndUpdate(
          req.params.id,
          update,
          { new: true }
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "assignedProvider",
            "name email phone"
          );

      if (!request) {
        return res.status(404).json({
          message:
            "Service request not found"
        });
      }

      res.json({ request });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   ADMIN PAYMENTS
========================= */

app.get(
  "/api/admin/payments",
  adminAuth,
  async (_req, res) => {
    try {
      const payments =
        await Payment.find({
          status: "submitted"
        })
          .sort({
            createdAt: -1
          })
          .populate(
            "user",
            "name email phone"
          )
          .populate(
            "booking",
            "property status paymentStatus paymentAmount"
          );

      res.json({
        payments
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   VERIFY / REJECT PAYMENT
========================= */

app.patch(
  "/api/admin/payments/:id",
  adminAuth,
  async (req, res) => {
    try {
      const status =
        String(
          req.body?.status || ""
        ).toLowerCase();

      if (
        ![
          "verified",
          "rejected"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Status must be verified or rejected"
        });
      }

      const payment =
        await Payment.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true }
        )
          .populate(
            "user",
            "name email phone"
          )
          .populate(
            "booking",
            "property status paymentStatus paymentAmount"
          );

      if (!payment) {
        return res.status(404).json({
          message:
            "Payment not found"
        });
      }

      /* Booking payment */

      if (
        payment.purpose ===
          "booking" &&
        payment.booking
      ) {
        const booking =
          await Booking.findById(
            payment.booking._id ||
              payment.booking
          );

        if (booking) {
          booking.paymentStatus =
            status;

          if (status === "verified") {
            booking.status =
              "confirmed";
          }

          if (
            status === "rejected" &&
            booking.status !==
              "cancelled"
          ) {
            booking.status =
              "pending";
          }

          await booking.save();
        }
      }

      res.json({
        payment,
        message:
          `Payment ${status} successfully`
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CREATE PROPERTY
========================= */

app.post(
  "/api/properties",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message:
            "Only owners can add properties"
        });
      }

      const {
        title,
        city,
        location,
        rent,
        type,
        description,
        image,
        images,
        contact,
        latitude,
        longitude,
        transactionId,

        roomType,
        occupancy,
        totalRooms,
        availableRooms,
        gender,
        furnished,
        food,
        attachedBathroom,
        securityDeposit,
        amenities,

        bhk,
        bathrooms,
        balconies,
        areaSqft,
        floor,
        totalFloors,
        facing,
        propertyAge,
        preferredTenants,
        maintenance,
        parking,
        lift,
        powerBackup
      } = req.body;

      if (
        !title ||
        rent === undefined
      ) {
        return res.status(400).json({
          message:
            "Title and rent are required"
        });
      }

      await requireSubmittedUploadPayment(
        req.user.id,
        transactionId
      );

      const property =
        await Property.create({
          title,
          city,
          location,

          rent: Number(rent),

          type:
            type || "Flat",

          description,

          image,

          images:
            Array.isArray(images)
              ? images.slice(0, 8)
              : [],

          contact,

          latitude:
            latitude !== undefined &&
            latitude !== ""
              ? Number(latitude)
              : undefined,

          longitude:
            longitude !== undefined &&
            longitude !== ""
              ? Number(longitude)
              : undefined,

          owner:
            req.user.id,

          roomType:
            String(
              roomType || ""
            ),

          occupancy:
            occupancy === "" ||
            occupancy == null
              ? undefined
              : Number(occupancy),

          totalRooms:
            totalRooms === "" ||
            totalRooms == null
              ? undefined
              : Number(totalRooms),

          availableRooms:
            availableRooms === "" ||
            availableRooms == null
              ? undefined
              : Number(
                  availableRooms
                ),

          gender:
            String(
              gender || ""
            ),

          furnished:
            String(
              furnished || ""
            ),

          food:
            String(
              food || ""
            ),

          attachedBathroom:
            Boolean(
              attachedBathroom
            ),

          securityDeposit:
            securityDeposit === "" ||
            securityDeposit == null
              ? undefined
              : Number(
                  securityDeposit
                ),

          amenities:
            Array.isArray(amenities)
              ? amenities.slice(0, 30)
              : [],

          bhk:
            bhk === "" ||
            bhk == null
              ? undefined
              : Number(bhk),

          bathrooms:
            bathrooms === "" ||
            bathrooms == null
              ? undefined
              : Number(
                  bathrooms
                ),

          balconies:
            balconies === "" ||
            balconies == null
              ? undefined
              : Number(
                  balconies
                ),

          areaSqft:
            areaSqft === "" ||
            areaSqft == null
              ? undefined
              : Number(
                  areaSqft
                ),

          floor:
            floor === "" ||
            floor == null
              ? undefined
              : Number(floor),

          totalFloors:
            totalFloors === "" ||
            totalFloors == null
              ? undefined
              : Number(
                  totalFloors
                ),

          facing:
            String(
              facing || ""
            ),

          propertyAge:
            String(
              propertyAge || ""
            ),

          preferredTenants:
            String(
              preferredTenants || ""
            ),

          maintenance:
            maintenance === "" ||
            maintenance == null
              ? undefined
              : Number(
                  maintenance
                ),

          parking:
            String(
              parking || ""
            ),

          lift:
            Boolean(lift),

          powerBackup:
            Boolean(powerBackup)
        });

      res.status(201).json({
        property
      });
    } catch (e) {
      const message =
        String(
          e?.message ||
            "Could not create property"
        );

      const isPaymentError =
        message.includes(
          "pending admin verification"
        ) ||
        message.includes("₹250");

      res.status(
        isPaymentError
          ? 403
          : 500
      ).json({
        message
      });
    }
  }
);


/* =========================
   EDIT PROPERTY
========================= */

app.put(
  "/api/properties/:id",
  auth,
  async (req, res) => {
    try {
      const property =
        await Property.findById(
          req.params.id
        );

      if (!property) {
        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      if (
        String(
          property.owner
        ) !== req.user.id
      ) {
        return res.status(403).json({
          message: "Not allowed"
        });
      }

      const allowed = [
        "title",
        "city",
        "location",
        "rent",
        "type",
        "description",
        "image",
        "images",
        "contact",
        "latitude",
        "longitude",
        "available",

        "roomType",
        "occupancy",
        "totalRooms",
        "availableRooms",
        "gender",
        "furnished",
        "food",
        "attachedBathroom",
        "securityDeposit",
        "amenities",

        "bhk",
        "bathrooms",
        "balconies",
        "areaSqft",
        "floor",
        "totalFloors",
        "facing",
        "propertyAge",
        "preferredTenants",
        "maintenance",
        "parking",
        "lift",
        "powerBackup"
      ];

      const numericFields = [
        "occupancy",
        "totalRooms",
        "availableRooms",
        "securityDeposit",
        "bhk",
        "bathrooms",
        "balconies",
        "areaSqft",
        "floor",
        "totalFloors",
        "maintenance"
      ];

      for (const key of allowed) {
        if (
          !Object.prototype.hasOwnProperty.call(
            req.body,
            key
          )
        ) {
          continue;
        }

        if (key === "rent") {
          const value =
            Number(
              req.body[key]
            );

          if (
            !Number.isFinite(value) ||
            value < 0
          ) {
            return res.status(400).json({
              message:
                "Rent must be a valid non-negative number"
            });
          }

          property.rent =
            value;
        }

        else if (
          numericFields.includes(
            key
          )
        ) {
          const value =
            req.body[key];

          property[key] =
            value === "" ||
            value === null ||
            value === undefined
              ? undefined
              : Number(value);
        }

        else if (
          key === "amenities"
        ) {
          if (
            Array.isArray(
              req.body[key]
            )
          ) {
            property.amenities =
              req.body[key].slice(
                0,
                30
              );
          }
        }

        else if (
          key === "images"
        ) {
          if (
            Array.isArray(
              req.body[key]
            )
          ) {
            property.images =
              req.body[key].slice(
                0,
                8
              );
          }
        }

        else if (
          key === "latitude" ||
          key === "longitude"
        ) {
          property[key] =
            req.body[key] === "" ||
            req.body[key] === null
              ? undefined
              : Number(
                  req.body[key]
                );
        }

        else {
          property[key] =
            req.body[key];
        }
      }

      await property.save();

      res.json({
        property
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   DELETE PROPERTY
========================= */

app.delete(
  "/api/properties/:id",
  auth,
  async (req, res) => {
    try {
      const property =
        await Property.findById(
          req.params.id
        );

      if (!property) {
        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      if (
        String(
          property.owner
        ) !== req.user.id
      ) {
        return res.status(403).json({
          message:
            "Not allowed"
        });
      }

      await property.deleteOne();

      res.json({
        message:
          "Property deleted"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CREATE BOOKING
========================= */

app.post(
  "/api/bookings",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "customer"
      ) {
        return res.status(403).json({
          message:
            "Only customer accounts can request a booking"
        });
      }

      const {
        property,
        moveInDate
      } = req.body;

      const foundProperty =
        await Property.findById(
          property
        );

      if (!foundProperty) {
        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      if (
        foundProperty.available ===
        false
      ) {
        return res.status(409).json({
          message:
            "This property is currently unavailable"
        });
      }

      const existing =
        await Booking.findOne({
          property,
          user: req.user.id,
          status: {
            $in: [
              "pending",
              "confirmed"
            ]
          }
        });

      if (existing) {
        return res.status(409).json({
          message:
            "You already have an active booking request for this property"
        });
      }

      const paymentRequired =
        BOOKING_PAYMENT_AMOUNT > 0;

      const booking =
        await Booking.create({
          property,
          user: req.user.id,

          status:
            paymentRequired
              ? "pending"
              : "pending",

          moveInDate:
            String(
              moveInDate || ""
            ),

          paymentRequired,

          paymentStatus:
            paymentRequired
              ? "pending"
              : "not_required",

          paymentAmount:
            paymentRequired
              ? BOOKING_PAYMENT_AMOUNT
              : 0
        });

      await booking.populate(
        "property"
      );

      res.status(201).json({
        booking,

        paymentRequired,

        paymentAmount:
          booking.paymentAmount,

        paymentStatus:
          booking.paymentStatus,

        upiId:
          paymentRequired
            ? PAYMENT_UPI_ID
            : null,

        message:
          paymentRequired
            ? "Booking request created. Please complete the booking payment."
            : "Booking request sent to the owner."
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   MY BOOKINGS
========================= */

app.get(
  "/api/bookings/my",
  auth,
  async (req, res) => {
    try {
      const bookings =
        await Booking.find({
          user: req.user.id
        })
          .sort({
            createdAt: -1
          })
          .populate("property");

      res.json({
        bookings
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   BOOKING PAYMENT SUBMIT
========================= */

app.post(
  "/api/bookings/:id/payment/submit",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "customer"
      ) {
        return res.status(403).json({
          message:
            "Only customers can submit booking payments"
        });
      }

      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id
        });

      if (!booking) {
        return res.status(404).json({
          message:
            "Booking not found"
        });
      }

      if (
        booking.status ===
        "cancelled"
      ) {
        return res.status(400).json({
          message:
            "Cancelled bookings cannot be paid"
        });
      }

      if (
        !booking.paymentRequired
      ) {
        return res.status(400).json({
          message:
            "Payment is not required for this booking"
        });
      }

      const transactionId =
        String(
          req.body?.transactionId ||
            ""
        ).trim();

      if (!transactionId) {
        return res.status(400).json({
          message:
            "UPI transaction ID is required"
        });
      }

      if (
        transactionId.length < 6 ||
        transactionId.length > 100
      ) {
        return res.status(400).json({
          message:
            "Please enter a valid UPI transaction ID"
        });
      }

      if (
        booking.paymentStatus ===
        "verified"
      ) {
        return res.status(400).json({
          message:
            "Booking payment is already verified"
        });
      }

      const existing =
        await Payment.findOne({
          transactionId
        });

      if (existing) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted"
        });
      }

      const payment =
        await Payment.create({
          user: req.user.id,

          booking:
            booking._id,

          orderId:
            `booking_${booking._id}_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,

          transactionId,

          amount:
            booking.paymentAmount,

          currency: "INR",

          status:
            "submitted",

          purpose:
            "booking"
        });

      booking.paymentId =
        payment._id;

      booking.paymentStatus =
        "submitted";

      await booking.save();

      res.status(201).json({
        submitted: true,

        paymentId:
          payment._id.toString(),

        transactionId,

        amount:
          booking.paymentAmount,

        status:
          "submitted",

        message:
          "Booking payment submitted. Admin verification is required."
      });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted"
        });
      }

      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CANCEL BOOKING
========================= */

app.patch(
  "/api/bookings/:id/cancel",
  auth,
  async (req, res) => {
    try {
      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id
        });

      if (!booking) {
        return res.status(404).json({
          message:
            "Booking not found"
        });
      }

      if (
        booking.status !==
        "pending"
      ) {
        return res.status(400).json({
          message:
            "Only pending booking requests can be cancelled"
        });
      }

      booking.status =
        "cancelled";

      await booking.save();

      res.json({
        booking,

        message:
          "Booking request cancelled"
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   OWNER BOOKINGS
========================= */

app.get(
  "/api/bookings/owner",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "owner"
      ) {
        return res.status(403).json({
          message:
            "Owner access required"
        });
      }

      const properties =
        await Property.find({
          owner: req.user.id
        }).select("_id");

      const ids =
        properties.map(
          item => item._id
        );

      const bookings =
        await Booking.find({
          property: {
            $in: ids
          }
        })
          .sort({
            createdAt: -1
          })
          .populate("property")
          .populate(
            "user",
            "name email phone"
          );

      res.json({
        bookings
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   OWNER BOOKING STATUS
========================= */

app.patch(
  "/api/bookings/:id/status",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "owner"
      ) {
        return res.status(403).json({
          message:
            "Owner access required"
        });
      }

      const status =
        String(
          req.body?.status ||
            ""
        ).toLowerCase();

      if (
        ![
          "pending",
          "confirmed",
          "cancelled"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid booking status"
        });
      }

      const booking =
        await Booking.findById(
          req.params.id
        ).populate(
          "property"
        );

      if (!booking) {
        return res.status(404).json({
          message:
            "Booking not found"
        });
      }

      if (
        !booking.property ||
        String(
          booking.property.owner
        ) !== req.user.id
      ) {
        return res.status(403).json({
          message:
            "Not allowed"
        });
      }

      if (
        status === "confirmed" &&
        booking.paymentRequired &&
        booking.paymentStatus !==
          "verified"
      ) {
        return res.status(400).json({
          message:
            "Booking cannot be confirmed until the required payment is verified by admin"
        });
      }

      booking.status =
        status;

      await booking.save();

      res.json({
        booking
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   START SERVER
========================= */

async function start() {
  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `HavenRent API running on ${PORT}`
      );
    }
  );

  if (!MONGO_URI) {
    console.warn(
      "MONGO_URI missing: authentication and database features require MongoDB Atlas."
    );

    return;
  }

  try {
    await mongoose.connect(
      MONGO_URI,
      {
        serverSelectionTimeoutMS:
          10000,

        connectTimeoutMS:
          10000
      }
    );

    console.log(
      "MongoDB connected"
    );
  } catch (e) {
    console.error(
      "MongoDB connection failed:",
      e.message
    );
  }
}

start();
    }
  }
);
    }
  }
);
