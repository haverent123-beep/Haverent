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

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "")
  .toLowerCase()
  .trim();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "https://haverent.in",
  "https://www.haverent.in",
  "https://nethouse.in",
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  express.json({
    limit: "15mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

/* =========================================================
   DATABASE SCHEMAS
========================================================= */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["customer", "owner", "provider"],
      default: "customer",
    },

    verificationStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "approved",
        "rejected",
      ],
      default: "not_required",
    },

    verificationNote: {
      type: String,
      default: "",
    },

    providerServices: {
      type: [String],
      default: [],
    },

    phone: {
      type: String,
      default: "",
    },

    documentUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    rent: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    contact: {
      type: String,
      default: "",
    },

    lat: {
      type: Number,
      default: null,
    },

    long: {
      type: Number,
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    available: {
      type: Boolean,
      default: true,
    },

    roomType: {
      type: String,
      default: "",
    },

    roomCount: {
      type: Number,
      default: 0,
    },

    bathrooms: {
      type: Number,
      default: 0,
    },

    furnishing: {
      type: String,
      default: "",
    },

    foodIncluded: {
      type: Boolean,
      default: false,
    },

    sharingType: {
      type: String,
      default: "",
    },

    flatType: {
      type: String,
      default: "",
    },

    bedrooms: {
      type: Number,
      default: 0,
    },

    securityDeposit: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["submitted", "verified", "rejected"],
      default: "submitted",
    },

    purpose: {
      type: String,
      enum: ["property_upload", "booking"],
      required: true,
    },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },

    moveInDate: {
      type: String,
      default: "",
    },

    paymentRequired: {
      type: Boolean,
      default: false,
    },

    paymentStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "submitted",
        "verified",
        "rejected",
      ],
      default: "not_required",
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    paymentAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    preferredDate: {
      type: String,
      default: "",
    },

    preferredTime: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      required: true,
    },

    notes: {
      type: String,
      default: "",
    },

    partnerName: {
      type: String,
      default: "",
    },

    partnerPhone: {
      type: String,
      default: "",
    },

    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    quotedPrice: {
      type: Number,
      default: 0,
    },

    providerNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

/* =========================================================
   MODELS
========================================================= */

const User = mongoose.model("User", userSchema);
const Property = mongoose.model("Property", propertySchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);

/* =========================================================
   AUTH HELPERS
========================================================= */

function tokenFor(user) {
  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = header.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

function adminAuth(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
}

async function providerApproved(req, res, next) {
  try {
    if (!req.user || req.user.role !== "provider") {
      return res.status(403).json({
        message: "Provider access required",
      });
    }

    const provider = await User.findById(req.user.id);

    if (!provider) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    if (provider.verificationStatus !== "approved") {
      return res.status(403).json({
        message:
          "Your provider account is waiting for admin approval",
        verificationStatus: provider.verificationStatus,
      });
    }

    req.provider = provider;

    next();
  } catch (error) {
    console.error("providerApproved error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post("/api/admin/login", (req, res) => {
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (
      !ADMIN_EMAIL ||
      !ADMIN_PASSWORD ||
      email !== ADMIN_EMAIL ||
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        message: "Invalid admin credentials",
      });
    }

    const token = jwt.sign(
      {
        id: "admin",
        role: "admin",
        email,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Admin login successful",
      token,
      user: {
        id: "admin",
        email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

/* =========================================================
   BASIC ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "HavenRent API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    database: mongoose.connection.readyState === 1,
    message: "API healthy",
  });
});

/* =========================================================
   REGISTER
========================================================= */

async function registerUser(req, res) {
  try {
    if (!MONGO_URI) {
      return res.status(503).json({
        message: "Database is not configured",
      });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();

    const password = String(req.body.password || "");

    const requestedRole = String(
      req.body.role || "customer"
    ).toLowerCase();

    const phone = String(req.body.phone || "").trim();

    const documentUrl = String(
      req.body.documentUrl || ""
    ).trim();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const safeRole = ["customer", "owner", "provider"].includes(
      requestedRole
    )
      ? requestedRole
      : "customer";

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const providerServices =
      safeRole === "provider"
        ? Array.isArray(req.body.providerServices)
          ? req.body.providerServices
          : []
        : [];

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: safeRole,
      phone,
      documentUrl,
      providerServices,
      verificationStatus:
        safeRole === "provider"
          ? "pending"
          : "not_required",
    });

    const token = tokenFor(user);

    return res.status(201).json({
      message:
        safeRole === "provider"
          ? "Provider registered. Waiting for admin approval."
          : "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        providerServices: user.providerServices,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
}

app.post("/api/auth/register", registerUser);
app.post("/api/register", registerUser);

/* =========================================================
   LOGIN
========================================================= */

async function loginUser(req, res) {
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();

    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (!MONGO_URI) {
      return res.status(503).json({
        message: "Database is not configured",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = tokenFor(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        verificationStatus: user.verificationStatus,
        providerServices: user.providerServices,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
}

app.post("/api/auth/login", loginUser);
app.post("/api/login", loginUser);

/* =========================================================
   CURRENT USER
========================================================= */

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.json({
        user: {
          id: "admin",
          role: "admin",
          email: ADMIN_EMAIL,
        },
      });
    }

    const user = await User.findById(req.user.id).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      user,
    });
  } catch (error) {
    console.error("Me error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

/* =========================================================
   ADMIN PROVIDER MANAGEMENT
========================================================= */

app.get(
  "/api/admin/providers",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const providers = await User.find({
        role: "provider",
      })
        .select("-password")
        .sort({ createdAt: -1 });

      return res.json({
        providers,
      });
    } catch (error) {
      console.error("Admin providers error:", error);

      return res.status(500).json({
        message: "Failed to load providers",
      });
    }
  }
);

app.get(
  "/api/admin/providers/pending",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const providers = await User.find({
        role: "provider",
        verificationStatus: "pending",
      })
        .select("-password")
        .sort({ createdAt: -1 });

      return res.json({
        providers,
      });
    } catch (error) {
      console.error(
        "Pending providers error:",
        error
      );

      return res.status(500).json({
        message: "Failed to load pending providers",
      });
    }
  }
);

app.patch(
  "/api/admin/providers/:id/verify",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const status = String(
        req.body.status || ""
      ).toLowerCase();

      const allowed = [
        "approved",
        "rejected",
        "pending",
      ];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message:
            "Status must be approved, rejected or pending",
        });
      }

      const provider = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          role: "provider",
        },
        {
          verificationStatus: status,
          verificationNote: String(
            req.body.note || ""
          ),
        },
        {
          new: true,
        }
      ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message: "Provider not found",
        });
      }

      return res.json({
        message: `Provider ${status}`,
        provider,
      });
    } catch (error) {
      console.error(
        "Provider verification error:",
        error
      );

      return res.status(500).json({
        message: "Failed to update provider",
      });
    }
  }
);

app.patch(
  "/api/admin/providers/:id/approve",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const provider = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          role: "provider",
        },
        {
          verificationStatus: "approved",
          verificationNote: String(
            req.body.note || ""
          ),
        },
        {
          new: true,
        }
      ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message: "Provider not found",
        });
      }

      return res.json({
        message: "Provider approved successfully",
        provider,
      });
    } catch (error) {
      console.error("Provider approve error:", error);

      return res.status(500).json({
        message: "Failed to approve provider",
      });
    }
  }
);

app.patch(
  "/api/admin/providers/:id/reject",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const provider = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          role: "provider",
        },
        {
          verificationStatus: "rejected",
          verificationNote: String(
            req.body.note || ""
          ),
        },
        {
          new: true,
        }
      ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message: "Provider not found",
        });
      }

      return res.json({
        message: "Provider rejected",
        provider,
      });
    } catch (error) {
      console.error("Provider reject error:", error);

      return res.status(500).json({
        message: "Failed to reject provider",
      });
    }
  }
);

/* =========================================================
   DEMO PROPERTIES
========================================================= */

const demoProperties = [
  {
    _id: "demo-1",
    title: "Demo 1BHK",
    city: "Bangalore",
    location: "Electronic City",
    rent: 12000,
    type: "1BHK",
    description: "Demo property",
    image: "",
    images: [],
    contact: "",
    available: true,
  },
  {
    _id: "demo-2",
    title: "Demo PG",
    city: "Hyderabad",
    location: "Madhapur",
    rent: 7000,
    type: "PG",
    description: "Demo PG",
    image: "",
    images: [],
    contact: "",
    available: true,
  },
];

/* =========================================================
   PROPERTIES
========================================================= */

app.get("/api/properties", async (req, res) => {
  try {
    if (!MONGO_URI) {
      let result = [...demoProperties];

      if (req.query.city) {
        result = result.filter(
          (p) =>
            p.city.toLowerCase() ===
            String(req.query.city)
              .toLowerCase()
              .trim()
        );
      }

      if (req.query.type) {
        result = result.filter(
          (p) =>
            p.type.toLowerCase() ===
            String(req.query.type)
              .toLowerCase()
              .trim()
        );
      }

      if (req.query.maxRent) {
        const maxRent = Number(req.query.maxRent);

        if (!Number.isNaN(maxRent)) {
          result = result.filter(
            (p) => Number(p.rent) <= maxRent
          );
        }
      }

      return res.json(result);
    }

    const filter = {
      available: true,
    };

    if (req.query.city) {
      filter.city = new RegExp(
        String(req.query.city).trim(),
        "i"
      );
    }

    if (req.query.type) {
      filter.type = new RegExp(
        String(req.query.type).trim(),
        "i"
      );
    }

    if (req.query.maxRent) {
      const maxRent = Number(req.query.maxRent);

      if (!Number.isNaN(maxRent)) {
        filter.rent = {
          $lte: maxRent,
        };
      }
    }

    const properties = await Property.find(filter)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    return res.json(properties);
  } catch (error) {
    console.error("Properties error:", error);

    return res.status(500).json({
      message: "Failed to load properties",
    });
  }
});

app.get("/api/properties/:id", async (req, res) => {
  try {
    if (!MONGO_URI) {
      const demo = demoProperties.find(
        (p) => p._id === req.params.id
      );

      if (!demo) {
        return res.status(404).json({
          message: "Property not found",
        });
      }

      return res.json(demo);
    }

    const property = await Property.findById(
      req.params.id
    ).populate("owner", "name email phone");

    if (!property) {
      return res.status(404).json({
        message: "Property not found",
      });
    }

    return res.json(property);
  } catch (error) {
    console.error("Property details error:", error);

    return res.status(500).json({
      message: "Failed to load property",
    });
  }
});

/* =========================================================
   PAYMENT CONFIG
========================================================= */

app.get("/api/payments/config", (req, res) => {
  res.json({
    propertyUploadFee: PROPERTY_UPLOAD_FEE,
    bookingPaymentAmount: BOOKING_PAYMENT_AMOUNT,
    upiId: PAYMENT_UPI_ID,
    currency: "INR",
  });
});

app.get(
  "/api/payments/my",
  auth,
  async (req, res) => {
    try {
      const payments = await Payment.find({
        user: req.user.id,
      })
        .populate("booking")
        .sort({ createdAt: -1 });

      return res.json({
        payments,
      });
    } catch (error) {
      console.error("My payments error:", error);

      return res.status(500).json({
        message: "Failed to load payments",
      });
    }
  }
);

/* =========================================================
   PROPERTY UPLOAD PAYMENT
========================================================= */

app.post(
  "/api/payments/manual/submit",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message:
            "Only property owners can submit this payment",
        });
      }

      const transactionId = String(
        req.body.transactionId || ""
      ).trim();

      if (!transactionId) {
        return res.status(400).json({
          message: "Transaction ID is required",
        });
      }

      const existing = await Payment.findOne({
        transactionId,
      });

      if (existing) {
        return res.status(409).json({
          message: "Transaction ID already submitted",
        });
      }

      const orderId =
        "PROP-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase();

      const payment = await Payment.create({
        user: req.user.id,
        orderId,
        transactionId,
        amount: PROPERTY_UPLOAD_FEE,
        currency: "INR",
        purpose: "property_upload",
        status: "submitted",
      });

      return res.status(201).json({
        message:
          "Payment submitted. Waiting for admin verification.",
        payment,
      });
    } catch (error) {
      console.error(
        "Property payment submit error:",
        error
      );

      return res.status(500).json({
        message: "Failed to submit payment",
      });
    }
  }
);

async function requireSubmittedUploadPayment(
  userId,
  transactionId
) {
  const payment = await Payment.findOne({
    user: userId,
    transactionId,
    purpose: "property_upload",
    amount: PROPERTY_UPLOAD_FEE,
    status: "verified",
  });

  return payment;
}

/* =========================================================
   SERVICES
========================================================= */

const SERVICE_CATALOG = [
  {
    id: "home-repairs",
    name: "Home Repairs",
    description: "Plumbing, electrical and general repairs",
  },
  {
    id: "move-shift",
    name: "Move & Shift",
    description: "Packing and shifting assistance",
  },
  {
    id: "home-cleaning",
    name: "Home Cleaning",
    description: "Professional home cleaning",
  },
  {
    id: "rental-agreement",
    name: "Rental Agreement",
    description: "Rental agreement assistance",
  },
  {
    id: "tenant-verification",
    name: "Tenant Verification",
    description: "Tenant verification assistance",
  },
  {
    id: "rent-management",
    name: "Rent Management",
    description: "Rent collection and management",
  },
];

app.get("/api/services", (req, res) => {
  res.json({
    services: SERVICE_CATALOG,
  });
});

/* =========================================================
   SERVICE REQUEST CREATE
========================================================= */

app.post(
  "/api/services/requests",
  auth,
  async (req, res) => {
    try {
      const service = String(
        req.body.service || ""
      ).trim();

      const preferredDate = String(
        req.body.preferredDate || ""
      ).trim();

      const preferredTime = String(
        req.body.preferredTime || ""
      ).trim();

      const address = String(
        req.body.address || ""
      ).trim();

      const notes = String(
        req.body.notes || ""
      ).trim();

      if (!service || !address) {
        return res.status(400).json({
          message: "Service and address are required",
        });
      }

      const request = await ServiceRequest.create({
        user: req.user.id,
        service,
        preferredDate,
        preferredTime,
        address,
        notes,
        status: "pending",
      });

      return res.status(201).json({
        message: "Service request created",
        request,
      });
    } catch (error) {
      console.error(
        "Create service request error:",
        error
      );

      return res.status(500).json({
        message: "Failed to create service request",
      });
    }
  }
);

/* =========================================================
   MY SERVICE REQUESTS
========================================================= */

app.get(
  "/api/services/requests/my",
  auth,
  async (req, res) => {
    try {
      const requests = await ServiceRequest.find({
        user: req.user.id,
      })
        .populate(
          "assignedProvider",
          "name phone email providerServices"
        )
        .sort({ createdAt: -1 });

      return res.json({
        requests,
      });
    } catch (error) {
      console.error(
        "My service requests error:",
        error
      );

      return res.status(500).json({
        message: "Failed to load service requests",
      });
    }
  }
);

/* =========================================================
   CANCEL SERVICE REQUEST
========================================================= */

app.patch(
  "/api/services/requests/:id/cancel",
  auth,
  async (req, res) => {
    try {
      const request =
        await ServiceRequest.findOne({
          _id: req.params.id,
          user: req.user.id,
        });

      if (!request) {
        return res.status(404).json({
          message: "Service request not found",
        });
      }

      if (
        !["pending", "accepted"].includes(
          request.status
        )
      ) {
        return res.status(400).json({
          message:
            "This service request cannot be cancelled",
        });
      }

      request.status = "cancelled";

      await request.save();

      return res.json({
        message: "Service request cancelled",
        request,
      });
    } catch (error) {
      console.error(
        "Cancel service request error:",
        error
      );

      return res.status(500).json({
        message: "Failed to cancel request",
      });
    }
  }
);

/* =========================================================
   PROVIDER SERVICES
========================================================= */

const PROVIDER_SERVICES = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification",
];

/* =========================================================
   PROVIDER PROFILE
========================================================= */

app.get(
  "/api/providers/me",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const jobs = await ServiceRequest.find({
        assignedProvider: req.provider._id,
      })
        .populate("user", "name phone email")
        .sort({ createdAt: -1 });

      return res.json({
        provider: {
          id: req.provider._id,
          name: req.provider.name,
          email: req.provider.email,
          phone: req.provider.phone,
          services: req.provider.providerServices,
          verificationStatus:
            req.provider.verificationStatus,
        },
        jobs,
      });
    } catch (error) {
      console.error(
        "Provider profile error:",
        error
      );

      return res.status(500).json({
        message: "Failed to load provider profile",
      });
    }
  }
);

/* =========================================================
   PROVIDER REQUESTS
========================================================= */

app.get(
  "/api/providers/requests",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const providerServices =
        req.provider.providerServices || [];

      const requests =
        await ServiceRequest.find({
          $or: [
            {
              assignedProvider: req.provider._id,
            },
            {
              assignedProvider: null,
              status: "pending",
              service: {
                $in: providerServices.length
                  ? providerServices
                  : PROVIDER_SERVICES,
              },
            },
          ],
        })
          .populate("user", "name phone email")
          .sort({ createdAt: -1 });

      return res.json({
        requests,
      });
    } catch (error) {
      console.error(
        "Provider requests error:",
        error
      );

      return res.status(500).json({
        message: "Failed to load provider requests",
      });
    }
  }
);

/* =========================================================
   PROVIDER ACCEPT REQUEST
========================================================= */

app.patch(
  "/api/providers/requests/:id/accept",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const quotedPrice =
        Number(req.body.quotedPrice) || 0;

      const providerNote = String(
        req.body.providerNote || ""
      ).trim();

      const request =
        await ServiceRequest.findOneAndUpdate(
          {
            _id: req.params.id,
            status: "pending",
            assignedProvider: null,
          },
          {
            assignedProvider: req.provider._id,
            status: "accepted",
            partnerName: req.provider.name,
            partnerPhone: req.provider.phone,
            quotedPrice,
            providerNote,
          },
          {
            new: true,
          }
        ).populate("user", "name phone email");

      if (!request) {
        return res.status(409).json({
          message:
            "Request is already accepted or unavailable",
        });
      }

      return res.json({
        message: "Service request accepted",
        request,
      });
    } catch (error) {
      console.error(
        "Provider accept error:",
        error
      );

      return res.status(500).json({
        message: "Failed to accept request",
      });
    }
  }
);

/* =========================================================
   PROVIDER REQUEST STATUS
========================================================= */

app.patch(
  "/api/providers/requests/:id/status",
  auth,
  providerApproved,
  async (req, res) => {
    try {
      const status = String(
        req.body.status || ""
      ).toLowerCase();

      const allowed = [
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ];

      if (!allowed.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status",
        });
      }

      const request =
        await ServiceRequest.findOne({
          _id: req.params.id,
          assignedProvider: req.provider._id,
        });

      if (!request) {
        return res.status(404).json({
          message:
            "Assigned service request not found",
        });
      }

      request.status = status;

      if (req.body.providerNote !== undefined) {
        request.providerNote = String(
          req.body.providerNote
        );
      }

      if (req.body.quotedPrice !== undefined) {
        const price = Number(
          req.body.quotedPrice
        );

        if (!Number.isNaN(price)) {
          request.quotedPrice = price;
        }
      }

      await request.save();

      return res.json({
        message: "Service request status updated",
        request,
      });
    } catch (error) {
      console.error(
        "Provider status error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update request status",
      });
    }
  }
);

/* =========================================================
   ADMIN SERVICE REQUESTS
========================================================= */

app.get(
  "/api/admin/services/requests",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const requests =
        await ServiceRequest.find({})
          .populate(
            "user",
            "name email phone role"
          )
          .populate(
            "assignedProvider",
            "name email phone providerServices"
          )
          .sort({ createdAt: -1 });

      return res.json({
        requests,
      });
    } catch (error) {
      console.error(
        "Admin service requests error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load service requests",
      });
    }
  }
);

app.patch(
  "/api/admin/services/requests/:id",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const update = {};

      if (req.body.status !== undefined) {
        const status = String(
          req.body.status
        ).toLowerCase();

        const allowed = [
          "pending",
          "accepted",
          "in_progress",
          "completed",
          "cancelled",
        ];

        if (!allowed.includes(status)) {
          return res.status(400).json({
            message: "Invalid service status",
          });
        }

        update.status = status;
      }

      if (req.body.quotedPrice !== undefined) {
        const price = Number(
          req.body.quotedPrice
        );

        if (Number.isNaN(price)) {
          return res.status(400).json({
            message: "Invalid quoted price",
          });
        }

        update.quotedPrice = price;
      }

      if (req.body.providerNote !== undefined) {
        update.providerNote = String(
          req.body.providerNote
        );
      }

      const request =
        await ServiceRequest.findByIdAndUpdate(
          req.params.id,
          update,
          {
            new: true,
          }
        )
          .populate(
            "user",
            "name email phone role"
          )
          .populate(
            "assignedProvider",
            "name email phone"
          );

      if (!request) {
        return res.status(404).json({
          message: "Service request not found",
        });
      }

      return res.json({
        message:
          "Service request updated",
        request,
      });
    } catch (error) {
      console.error(
        "Admin service update error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update service request",
      });
    }
  }
);

/* =========================================================
   ADMIN PAYMENTS
========================================================= */

app.get(
  "/api/admin/payments",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const payments = await Payment.find({
        status: "submitted",
      })
        .populate(
          "user",
          "name email phone role"
        )
        .populate("booking")
        .sort({ createdAt: -1 });

      return res.json({
        payments,
      });
    } catch (error) {
      console.error(
        "Admin payments error:",
        error
      );

      return res.status(500).json({
        message: "Failed to load payments",
      });
    }
  }
);

/* =========================================================
   ADMIN PAYMENT VERIFY / REJECT
========================================================= */

app.patch(
  "/api/admin/payments/:id",
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const status = String(
        req.body.status || ""
      ).toLowerCase();

      if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({
          message:
            "Status must be verified or rejected",
        });
      }

      const payment =
        await Payment.findByIdAndUpdate(
          req.params.id,
          {
            status,
          },
          {
            new: true,
          }
        );

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found",
        });
      }

      if (payment.booking) {
        const booking =
          await Booking.findById(
            payment.booking
          );

        if (booking) {
          if (status === "verified") {
            booking.paymentStatus =
              "verified";

            booking.status = "confirmed";

            await booking.save();
          } else {
            booking.paymentStatus =
              "rejected";

            await booking.save();
          }
        }
      }

      return res.json({
        message:
          status === "verified"
            ? "Payment verified"
            : "Payment rejected",
        payment,
      });
    } catch (error) {
      console.error(
        "Admin payment update error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update payment",
      });
    }
  }
);

/* =========================================================
   CREATE PROPERTY
========================================================= */

app.post(
  "/api/properties",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message:
            "Only property owners can add properties",
        });
      }

      const transactionId = String(
        req.body.transactionId || ""
      ).trim();

      if (!transactionId) {
        return res.status(400).json({
          message:
            "Verified payment transaction ID is required",
        });
      }

      const payment =
        await requireSubmittedUploadPayment(
          req.user.id,
          transactionId
        );

      if (!payment) {
        return res.status(400).json({
          message:
            "Payment is not verified by admin yet",
        });
      }

      const title = String(
        req.body.title || ""
      ).trim();

      const city = String(
        req.body.city || ""
      ).trim();

      const location = String(
        req.body.location || ""
      ).trim();

      const rent = Number(req.body.rent);

      if (
        !title ||
        !city ||
        !location ||
        Number.isNaN(rent)
      ) {
        return res.status(400).json({
          message:
            "Title, city, location and valid rent are required",
        });
      }

      const property = await Property.create({
        title,
        city,
        location,
        rent,

        type: String(
          req.body.type || ""
        ),

        description: String(
          req.body.description || ""
        ),

        image: String(
          req.body.image || ""
        ),

        images: Array.isArray(req.body.images)
          ? req.body.images
          : [],

        contact: String(
          req.body.contact || ""
        ),

        lat:
          req.body.lat !== undefined &&
          req.body.lat !== ""
            ? Number(req.body.lat)
            : null,

        long:
          req.body.long !== undefined &&
          req.body.long !== ""
            ? Number(req.body.long)
            : null,

        owner: req.user.id,

        available:
          req.body.available !== undefined
            ? Boolean(req.body.available)
            : true,

        roomType: String(
          req.body.roomType || ""
        ),

        roomCount:
          Number(req.body.roomCount) || 0,

        bathrooms:
          Number(req.body.bathrooms) || 0,

        furnishing: String(
          req.body.furnishing || ""
        ),

        foodIncluded:
          Boolean(req.body.foodIncluded),

        sharingType: String(
          req.body.sharingType || ""
        ),

        flatType: String(
          req.body.flatType || ""
        ),

        bedrooms:
          Number(req.body.bedrooms) || 0,

        securityDeposit:
          Number(req.body.securityDeposit) || 0,
      });

      return res.status(201).json({
        message:
          "Property created successfully",
        property,
      });
    } catch (error) {
      console.error(
        "Create property error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create property",
      });
    }
  }
);

/* =========================================================
   UPDATE PROPERTY
========================================================= */

app.put(
  "/api/properties/:id",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message: "Owner access required",
        });
      }

      const property =
        await Property.findOne({
          _id: req.params.id,
          owner: req.user.id,
        });

      if (!property) {
        return res.status(404).json({
          message: "Property not found",
        });
      }

      const allowedFields = [
        "title",
        "city",
        "location",
        "rent",
        "type",
        "description",
        "image",
        "images",
        "contact",
        "lat",
        "long",
        "available",
        "roomType",
        "roomCount",
        "bathrooms",
        "furnishing",
        "foodIncluded",
        "sharingType",
        "flatType",
        "bedrooms",
        "securityDeposit",
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          property[field] = req.body[field];
        }
      }

      await property.save();

      return res.json({
        message:
          "Property updated successfully",
        property,
      });
    } catch (error) {
      console.error(
        "Update property error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update property",
      });
    }
  }
);

/* =========================================================
   DELETE PROPERTY
========================================================= */

app.delete(
  "/api/properties/:id",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message: "Owner access required",
        });
      }

      const property =
        await Property.findOneAndDelete({
          _id: req.params.id,
          owner: req.user.id,
        });

      if (!property) {
        return res.status(404).json({
          message: "Property not found",
        });
      }

      return res.json({
        message:
          "Property deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete property error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete property",
      });
    }
  }
);

/* =========================================================
   CREATE BOOKING
========================================================= */

app.post(
  "/api/bookings",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          message:
            "Only customers can create bookings",
        });
      }

      const propertyId = String(
        req.body.propertyId ||
          req.body.property ||
          ""
      ).trim();

      const moveInDate = String(
        req.body.moveInDate || ""
      ).trim();

      if (!propertyId) {
        return res.status(400).json({
          message: "Property ID is required",
        });
      }

      const property =
        await Property.findById(propertyId);

      if (!property) {
        return res.status(404).json({
          message: "Property not found",
        });
      }

      if (!property.available) {
        return res.status(400).json({
          message:
            "This property is currently unavailable",
        });
      }

      const existing =
        await Booking.findOne({
          property: propertyId,
          user: req.user.id,
          status: {
            $in: ["pending", "confirmed"],
          },
        });

      if (existing) {
        return res.status(409).json({
          message:
            "You already have an active booking for this property",
          booking: existing,
        });
      }

      const paymentRequired =
        BOOKING_PAYMENT_AMOUNT > 0;

      const booking =
        await Booking.create({
          property: propertyId,
          user: req.user.id,
          status: "pending",
          moveInDate,
          paymentRequired,
          paymentStatus: paymentRequired
            ? "pending"
            : "not_required",
          paymentAmount:
            paymentRequired
              ? BOOKING_PAYMENT_AMOUNT
              : 0,
        });

      const populated =
        await Booking.findById(
          booking._id
        ).populate(
          "property"
        );

      return res.status(201).json({
        message:
          paymentRequired
            ? "Booking created. Please complete payment."
            : "Booking created successfully",
        booking: populated,
      });
    } catch (error) {
      console.error(
        "Create booking error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create booking",
      });
    }
  }
);

/* =========================================================
   MY BOOKINGS
========================================================= */

app.get(
  "/api/bookings/my",
  auth,
  async (req, res) => {
    try {
      const bookings =
        await Booking.find({
          user: req.user.id,
        })
          .populate("property")
          .sort({ createdAt: -1 });

      return res.json({
        bookings,
      });
    } catch (error) {
      console.error(
        "My bookings error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load bookings",
      });
    }
  }
);

/* =========================================================
   BOOKING PAYMENT SUBMIT
========================================================= */

app.post(
  "/api/bookings/:id/payment/submit",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          message:
            "Only customers can submit booking payment",
        });
      }

      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id,
        });

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      if (!booking.paymentRequired) {
        return res.status(400).json({
          message:
            "Payment is not required for this booking",
        });
      }

      if (
        booking.paymentStatus === "verified"
      ) {
        return res.status(400).json({
          message:
            "Booking payment is already verified",
        });
      }

      const transactionId = String(
        req.body.transactionId || ""
      ).trim();

      if (!transactionId) {
        return res.status(400).json({
          message:
            "Transaction ID is required",
        });
      }

      const existing =
        await Payment.findOne({
          transactionId,
        });

      if (existing) {
        return res.status(409).json({
          message:
            "Transaction ID already submitted",
        });
      }

      const orderId =
        "BOOK-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase();

      const payment =
        await Payment.create({
          user: req.user.id,
          booking: booking._id,
          orderId,
          transactionId,
          amount:
            booking.paymentAmount ||
            BOOKING_PAYMENT_AMOUNT,
          currency: "INR",
          status: "submitted",
          purpose: "booking",
        });

      booking.paymentId = payment._id;
      booking.paymentStatus = "submitted";

      await booking.save();

      return res.status(201).json({
        message:
          "Booking payment submitted. Waiting for admin verification.",
        payment,
        booking,
      });
    } catch (error) {
      console.error(
        "Booking payment submit error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to submit booking payment",
      });
    }
  }
);

/* =========================================================
   CANCEL BOOKING
========================================================= */

app.patch(
  "/api/bookings/:id/cancel",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          message:
            "Only customers can cancel bookings",
        });
      }

      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id,
        });

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({
          message:
            "Only pending bookings can be cancelled",
        });
      }

      booking.status = "cancelled";

      await booking.save();

      return res.json({
        message:
          "Booking cancelled successfully",
        booking,
      });
    } catch (error) {
      console.error(
        "Cancel booking error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to cancel booking",
      });
    }
  }
);

/* =========================================================
   OWNER BOOKINGS
========================================================= */

app.get(
  "/api/bookings/owner",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message: "Owner access required",
        });
      }

      const properties =
        await Property.find({
          owner: req.user.id,
        }).select("_id");

      const propertyIds =
        properties.map((p) => p._id);

      const bookings =
        await Booking.find({
          property: {
            $in: propertyIds,
          },
        })
          .populate(
            "property"
          )
          .populate(
            "user",
            "name email phone"
          )
          .sort({ createdAt: -1 });

      return res.json({
        bookings,
      });
    } catch (error) {
      console.error(
        "Owner bookings error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load owner bookings",
      });
    }
  }
);

/* =========================================================
   OWNER UPDATE BOOKING STATUS
========================================================= */

app.patch(
  "/api/bookings/:id/status",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "owner") {
        return res.status(403).json({
          message: "Owner access required",
        });
      }

      const status = String(
        req.body.status || ""
      ).toLowerCase();

      if (
        ![
          "pending",
          "confirmed",
          "cancelled",
        ].includes(status)
      ) {
        return res.status(400).json({
          message: "Invalid booking status",
        });
      }

      const booking =
        await Booking.findById(
          req.params.id
        ).populate("property");

      if (!booking) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      if (!booking.property) {
        return res.status(404).json({
          message:
            "Booking property not found",
        });
      }

      if (
        String(
          booking.property.owner
        ) !== String(req.user.id)
      ) {
        return res.status(403).json({
          message:
            "You do not own this property",
        });
      }

      if (
        status === "confirmed" &&
        booking.paymentRequired &&
        booking.paymentStatus !== "verified"
      ) {
        return res.status(400).json({
          message:
            "Booking payment must be verified before confirmation",
          paymentStatus:
            booking.paymentStatus,
        });
      }

      booking.status = status;

      await booking.save();

      if (status === "confirmed") {
        await Property.findByIdAndUpdate(
          booking.property._id,
          {
            available: false,
          }
        );
      }

      if (status === "cancelled") {
        await Property.findByIdAndUpdate(
          booking.property._id,
          {
            available: true,
          }
        );
      }

      const updated =
        await Booking.findById(
          booking._id
        )
          .populate("property")
          .populate(
            "user",
            "name email phone"
          );

      return res.json({
        message:
          "Booking status updated",
        booking: updated,
      });
    } catch (error) {
      console.error(
        "Owner booking status error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update booking status",
      });
    }
  }
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message: "Internal server error",
  });
});

/* =========================================================
   START SERVER
========================================================= */

async function start() {
  try {
    app.listen(PORT, () => {
      console.log(
        `HavenRent server running on port ${PORT}`
      );
    });

    if (!MONGO_URI) {
      console.warn(
        "WARNING: MONGO_URI is not configured."
      );
      console.warn(
        "Database-dependent routes will not work."
      );
      return;
    }

    await mongoose.connect(MONGO_URI);

    console.log(
      "MongoDB connected successfully"
    );
  } catch (error) {
    console.error(
      "Server/database startup error:",
      error
    );
  }
}

start();
