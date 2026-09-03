import express from "express";
import crypto from "crypto";
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

const PROVIDER_REGISTRATION_FEE = Number(
  process.env.PROVIDER_REGISTRATION_FEE || 250
);

const BOOKING_FEE = Number(
  process.env.BOOKING_FEE || 100
);

const PROPERTY_UPLOAD_FEE = 250;

const PAYMENT_UPI_ID =
  process.env.PAYMENT_UPI_ID || "9553473078-4@ybl";

const ADMIN_EMAIL =
  String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "";

const EXTRA_ORIGINS = String(
  process.env.FRONTEND_ORIGINS || ""
)
  .split(",")
  .map(x => x.trim())
  .filter(Boolean);

const allowedOrigins = [
  "https://haverent.netlify.app",
  "https://haveerent.netlify.app",
  "https://nethouse.netlify.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        EXTRA_ORIGINS.includes(origin) ||
        /^https:\/\/.*\.netlify\.app$/.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
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
   USER
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
      enum: [
        "customer",
        "owner",
        "provider"
      ],
      default: "customer"
    },

    verificationStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "verified",
        "rejected"
      ],
      default: "not_required"
    },

    phone: {
      type: String,
      default: ""
    },

    providerServices: {
      type: [String],
      default: []
    },

    ownerToken: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true
  }
);


/* =========================
   PROPERTY
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
   BOOKING
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

    paymentStatus: {
      type: String,
      enum: [
        "submitted",
        "verified",
        "rejected"
      ],
      default: "submitted"
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null
    },

    receiptNo: {
      type: String,
      default: ""
    },

    moveInDate: String
  },
  {
    timestamps: true
  }
);


/* =========================
   PAYMENT
========================= */

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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
      required: true,
      default: PROPERTY_UPLOAD_FEE
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
        "provider_registration",
        "booking"
      ],
      default: "property_upload"
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },

    receiptNo: {
      type: String,
      default: ""
    },

    usedAt: {
      type: Date,
      default: null
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


/* =========================
   SERVICE REQUEST
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


/* =========================
   NOTIFICATION
========================= */

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "booking",
      "payment",
      "provider_registration"
    ],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  read: {
    type: Boolean,
    default: false
  },

  relatedId: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema);
const Property = mongoose.model("Property", propertySchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);
const Notification = mongoose.model(
  "Notification",
  notificationSchema
);


/* =========================
   SERVICE CATALOG
========================= */

const SERVICE_CATALOG = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification"
];

const PROVIDER_SERVICES = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification"
];


/* =========================
   ADMIN NOTIFICATION HELPER
========================= */

async function notifyAdmin(
  type,
  title,
  message,
  relatedId = ""
) {
  try {
    await Notification.create({
      type,
      title,
      message,
      relatedId
    });
  } catch (e) {
    console.error(
      "Admin notification error:",
      e.message
    );
  }
}


/* =========================
   AUTH
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
  const h =
    req.headers.authorization || "";

  const token =
    h.startsWith("Bearer ")
      ? h.slice(7)
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
   ADMIN LOGIN
========================= */

app.post(
  "/api/admin/login",
  (req, res) => {
    const email =
      String(
        req.body?.email || ""
      )
        .toLowerCase()
        .trim();

    const password =
      String(
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
   BASIC
========================= */

app.get(
  "/",
  (_, res) => {
    res.json({
      name: "HavenRent API",
      status: "online"
    });
  }
);

app.get(
  "/api/health",
  (_, res) => {
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
        role = "customer"
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

      if (
        await User.findOne({
          email:
            email.toLowerCase()
        })
      ) {
        return res.status(409).json({
          message:
            "Email already registered"
        });
      }

      const hash =
        await bcrypt.hash(
          password,
          12
        );

      const safeRole =
        [
          "customer",
          "owner",
          "provider"
        ].includes(
          String(role).toLowerCase()
        )
          ? String(role).toLowerCase()
          : "customer";

      const verificationStatus =
        safeRole === "provider"
          ? "pending"
          : "not_required";

      const ownerToken =
        safeRole === "owner"
          ? `OWN-${crypto
              .randomBytes(5)
              .toString("hex")
              .toUpperCase()}`
          : undefined;

      const user =
        await User.create({
          name,
          email:
            email.toLowerCase(),
          password: hash,
          role: safeRole,
          verificationStatus,
          phone:
            String(
              req.body?.phone || ""
            ).trim(),
          providerServices:
            Array.isArray(
              req.body?.providerServices
            )
              ? req.body.providerServices.slice(
                  0,
                  10
                )
              : [],
          ownerToken
        });

      if (
        safeRole === "provider"
      ) {
        await notifyAdmin(
          "provider_registration",
          "New Provider Registration",
          `${user.name} registered as a service provider.`,
          String(user._id)
        );
      }

      res.status(201).json({
        token: tokenFor(user),

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          verificationStatus:
            user.verificationStatus,
          phone: user.phone,
          providerServices:
            user.providerServices,
          ownerToken:
            user.ownerToken
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
      const {
        email,
        password
      } = req.body;

      const user =
        await User.findOne({
          email:
            email?.toLowerCase()
        });

      if (
        !user ||
        !(
          await bcrypt.compare(
            password || "",
            user.password
          )
        )
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
          phone: user.phone,
          providerServices:
            user.providerServices,
          ownerToken:
            user.ownerToken
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
  }
);


/* =========================
   DEMO PROPERTIES
========================= */

const demoProperties = [
  {
    _id: "demo-1",
    title: "Modern Luxury Apartment",
    city: "Visakhapatnam",
    location:
      "Visakhapatnam, Andhra Pradesh",
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
    location:
      "Hyderabad, Telangana",
    rent: 12000,
    type: "House",
    description:
      "A bright and comfortable rental home.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
  }
];


/* =========================
   PROPERTIES
========================= */

app.get(
  "/api/properties",
  async (req, res) => {
    try {
      const q = {};

      if (req.query.city) {
        q.city =
          new RegExp(
            req.query.city,
            "i"
          );
      }

      if (req.query.type) {
        q.type =
          req.query.type;
      }

      if (req.query.maxRent) {
        q.rent = {
          $lte:
            Number(
              req.query.maxRent
            )
        };
      }

      if (!MONGO_URI) {
        return res.json({
          properties:
            demoProperties
        });
      }

      const properties =
        await Property.find(q)
          .sort({
            createdAt: -1
          })
          .populate(
            "owner",
            "name email"
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


app.get(
  "/api/properties/:id",
  async (req, res) => {
    try {
      const p =
        await Property.findById(
          req.params.id
        ).populate(
          "owner",
          "name email"
        );

      if (!p) {
        const demo =
          demoProperties.find(
            x =>
              String(x._id) ===
              String(
                req.params.id
              )
          );

        if (demo) {
          return res.json({
            property: demo
          });
        }

        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      res.json({
        property: p
      });
    } catch (e) {
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
      currency: "INR",

      amounts: {
        property_upload:
          PROPERTY_UPLOAD_FEE,

        provider_registration:
          PROVIDER_REGISTRATION_FEE,

        booking:
          BOOKING_FEE
      }
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
          .populate("booking")
          .sort({
            createdAt: -1
          })
          .limit(50);

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
   MANUAL UPI PAYMENT
========================= */

app.post(
  "/api/payments/manual/submit",
  auth,
  async (req, res) => {
    try {
      const purpose =
        String(
          req.body?.purpose || ""
        ).trim();

      const transactionId =
        String(
          req.body?.transactionId ||
            ""
        ).trim();

      if (
        ![
          "property_upload",
          "provider_registration",
          "booking"
        ].includes(purpose)
      ) {
        return res.status(400).json({
          message:
            "Invalid payment purpose"
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
        await Payment.findOne({
          transactionId
        })
      ) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted"
        });
      }

      if (
        purpose ===
          "property_upload" &&
        req.user.role !== "owner"
      ) {
        return res.status(403).json({
          message:
            "Only owners can pay this fee"
        });
      }

      if (
        purpose ===
          "provider_registration" &&
        req.user.role !== "provider"
      ) {
        return res.status(403).json({
          message:
            "Only providers can pay this fee"
        });
      }

      if (
        purpose === "booking" &&
        req.user.role !== "customer"
      ) {
        return res.status(403).json({
          message:
            "Only customers can pay this fee"
        });
      }

      let booking = null;

      if (
        purpose === "booking"
      ) {
        booking =
          await Booking.findOne({
            _id:
              String(
                req.body?.bookingId ||
                  ""
              ),
            user: req.user.id
          });

        if (!booking) {
          return res.status(404).json({
            message:
              "Booking not found"
          });
        }
      }

      const amount =
        purpose ===
        "property_upload"
          ? PROPERTY_UPLOAD_FEE
          : purpose ===
            "provider_registration"
          ? PROVIDER_REGISTRATION_FEE
          : BOOKING_FEE;

      const payment =
        await Payment.create({
          user: req.user.id,

          orderId:
            `${purpose}_${req.user.id}_${Date.now()}_${crypto
              .randomBytes(3)
              .toString("hex")}`,

          transactionId,

          amount,

          currency: "INR",

          status: "submitted",

          purpose,

          booking:
            booking
              ? booking._id
              : null
        });

      if (booking) {
        booking.paymentStatus =
          "submitted";

        booking.paymentId =
          payment._id;

        if (!booking.receiptNo) {
          booking.receiptNo =
            `HR-${new Date().getFullYear()}-${String(
              booking._id
            )
              .slice(-8)
              .toUpperCase()}`;
        }

        await booking.save();
      }

      const paymentLabel =
        purpose ===
        "provider_registration"
          ? "Provider registration"
          : purpose === "booking"
          ? "Booking"
          : "Property upload";

      const payer =
        await User.findById(
          req.user.id
        ).select(
          "name role"
        );

      await notifyAdmin(
        "payment",
        "New Payment Submitted",
        `${paymentLabel} payment of ₹${amount} submitted by ${
          payer?.name || "User"
        }. UTR: ${transactionId}`,
        String(payment._id)
      );

      res.status(201).json({
        submitted: true,
        paymentId:
          String(payment._id),
        amount,
        purpose,
        message:
          "Payment submitted. Admin verification is required."
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   SERVICES
========================= */

app.get(
  "/api/services",
  (_req, res) => {
    res.json({
      services:
        SERVICE_CATALOG
    });
  }
);


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
          req.body?.preferredDate ||
            ""
        ).trim();

      const preferredTime =
        String(
          req.body?.preferredTime ||
            ""
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
   PROVIDER
========================= */

app.get(
  "/api/providers/me",
  auth,
  async (req, res) => {
    if (
      req.user.role !==
      "provider"
    ) {
      return res.status(403).json({
        message:
          "Provider account required"
      });
    }

    const me =
      await User.findById(
        req.user.id
      ).select(
        "verificationStatus"
      );

    if (
      me?.verificationStatus !==
      "verified"
    ) {
      return res.status(403).json({
        message:
          "Provider account is waiting for admin verification"
      });
    }

    const user =
      await User.findById(
        req.user.id
      ).select("-password");

    if (!user) {
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
      provider: user,
      jobs
    });
  }
);


app.get(
  "/api/providers/requests",
  auth,
  async (req, res) => {
    if (
      req.user.role !==
      "provider"
    ) {
      return res.status(403).json({
        message:
          "Provider account required"
      });
    }

    const me =
      await User.findById(
        req.user.id
      ).select(
        "verificationStatus"
      );

    if (
      me?.verificationStatus !==
      "verified"
    ) {
      return res.status(403).json({
        message:
          "Provider account is waiting for admin verification"
      });
    }

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
  }
);


app.patch(
  "/api/providers/requests/:id/accept",
  auth,
  async (req, res) => {
    if (
      req.user.role !==
      "provider"
    ) {
      return res.status(403).json({
        message:
          "Provider account required"
      });
    }

    const me =
      await User.findById(
        req.user.id
      ).select(
        "verificationStatus"
      );

    if (
      me?.verificationStatus !==
      "verified"
    ) {
      return res.status(403).json({
        message:
          "Provider account is waiting for admin verification"
      });
    }

    try {
      const request =
        await ServiceRequest.findOneAndUpdate(
          {
            _id: req.params.id,
            status: "pending",
            assignedProvider:
              null
          },

          {
            assignedProvider:
              req.user.id,

            status: "accepted",

            partnerName:
              req.body?.partnerName ||
              "",

            partnerPhone:
              req.body?.partnerPhone ||
              "",

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


app.patch(
  "/api/providers/requests/:id/status",
  auth,
  async (req, res) => {
    if (
      req.user.role !==
      "provider"
    ) {
      return res.status(403).json({
        message:
          "Provider account required"
      });
    }

    const me =
      await User.findById(
        req.user.id
      ).select(
        "verificationStatus"
      );

    if (
      me?.verificationStatus !==
      "verified"
    ) {
      return res.status(403).json({
        message:
          "Provider account is waiting for admin verification"
      });
    }

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

    if (
      !allowed.includes(status)
    ) {
      return res.status(400).json({
        message:
          "Invalid provider status"
      });
    }

    try {
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
    }
  }
);


/* =========================
   ADMIN NOTIFICATIONS
========================= */

app.get(
  "/api/admin/notifications",
  adminAuth,
  async (req, res) => {
    try {
      const notifications =
        await Notification.find()
          .sort({
            createdAt: -1
          })
          .limit(100);

      const unread =
        await Notification.countDocuments({
          read: false
        });

      res.json({
        notifications,
        unread
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


app.patch(
  "/api/admin/notifications/:id/read",
  adminAuth,
  async (req, res) => {
    try {
      const n =
        await Notification.findByIdAndUpdate(
          req.params.id,
          {
            read: true
          },
          {
            new: true
          }
        );

      if (!n) {
        return res.status(404).json({
          message:
            "Notification not found"
        });
      }

      res.json({
        notification: n
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


app.patch(
  "/api/admin/notifications/read-all",
  adminAuth,
  async (req, res) => {
    try {
      await Notification.updateMany(
        {
          read: false
        },
        {
          $set: {
            read: true
          }
        }
      );

      res.json({
        ok: true
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   ADMIN PROVIDERS
========================= */

app.get(
  "/api/admin/providers",
  adminAuth,
  async (req, res) => {
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


app.patch(
  "/api/admin/providers/:id",
  adminAuth,
  async (req, res) => {
    try {
      const status =
        String(
          req.body?.verificationStatus ||
            ""
        );

      if (
        ![
          "pending",
          "verified",
          "rejected"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid verification status"
        });
      }

      if (
        status === "verified"
      ) {
        const paid =
          await Payment.findOne({
            user: req.params.id,

            purpose:
              "provider_registration",

            status: "verified"
          });

        if (!paid) {
          return res.status(400).json({
            message:
              "Verify the provider registration payment before approving this provider"
          });
        }
      }

      const provider =
        await User.findOneAndUpdate(
          {
            _id:
              req.params.id,

            role:
              "provider"
          },

          {
            verificationStatus:
              status
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
   ADMIN SERVICE REQUESTS
========================= */

app.get(
  "/api/admin/services/requests",
  adminAuth,
  async (req, res) => {
    try {
      const requests =
        await ServiceRequest.find()
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
        String(
          req.body?.status || ""
        );

      if (
        !allowed.includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid service status"
        });
      }

      const update = {
        status,

        partnerName:
          req.body?.partnerName,

        partnerPhone:
          req.body?.partnerPhone
      };

      if (
        req.body?.assignedProvider
      ) {
        update.assignedProvider =
          req.body.assignedProvider;
      }

      if (
        req.body?.quotedPrice !==
        undefined
      ) {
        update.quotedPrice =
          req.body.quotedPrice ===
          ""
            ? null
            : Number(
                req.body.quotedPrice
              );
      }

      const request =
        await ServiceRequest.findByIdAndUpdate(
          req.params.id,
          update,
          {
            new: true
          }
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "assignedProvider",
            "name email"
          );

      if (!request) {
        return res.status(404).json({
          message:
            "Service request not found"
        });
      }

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
   ADMIN PAYMENTS
========================= */

app.get(
  "/api/admin/payments",
  adminAuth,
  async (req, res) => {
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
            "name email"
          )
          .populate(
            "booking",
            "receiptNo property moveInDate"
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


app.patch(
  "/api/admin/payments/:id",
  adminAuth,
  async (req, res) => {
    try {
      const status =
        String(
          req.body?.status || ""
        );

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
        await Payment.findById(
          req.params.id
        );

      if (!payment) {
        return res.status(404).json({
          message:
            "Payment not found"
        });
      }

      payment.status =
        status;

      if (
        status === "verified"
      ) {
        payment.receiptNo =
          `PAY-${new Date().getFullYear()}-${crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()}`;
      }

      await payment.save();

      if (
        payment.purpose ===
          "booking" &&
        payment.booking
      ) {
        const booking =
          await Booking.findById(
            payment.booking
          );

        if (booking) {
          booking.paymentStatus =
            status;

          booking.paymentId =
            payment._id;

          booking.receiptNo =
            booking.receiptNo ||
            payment.receiptNo;

          await booking.save();
        }
      }

      const populated =
        await Payment.findById(
          payment._id
        )
          .populate(
            "user",
            "name email"
          )
          .populate("booking");

      res.json({
        payment: populated
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


/* =========================
   CUSTOMER RECEIPT
========================= */

app.get(
  "/api/bookings/:id/receipt",
  auth,
  async (req, res) => {
    try {
      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id
        })
          .populate("property")
          .populate(
            "user",
            "name email"
          );

      if (!booking) {
        return res.status(404).json({
          message:
            "Booking not found"
        });
      }

      if (
        booking.paymentStatus !==
        "verified"
      ) {
        return res.status(403).json({
          message:
            "Receipt is available after admin verifies the booking payment"
        });
      }

      const payment =
        await Payment.findOne({
          booking:
            booking._id,

          status:
            "verified"
        });

      res.json({
        receipt: {
          receiptNo:
            booking.receiptNo ||
            payment?.receiptNo,

          bookingId:
            booking._id,

          customer:
            booking.user,

          property:
            booking.property,

          moveInDate:
            booking.moveInDate,

          amount:
            payment?.amount ||
            BOOKING_FEE,

          transactionId:
            payment?.transactionId ||
            "",

          verifiedAt:
            payment?.updatedAt
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
   OWNER PROPERTY PAYMENT
========================= */

async function requireSubmittedUploadPayment(
  userId,
  transactionId
) {
  const payment =
    await Payment.findOne({
      user: userId,

      transactionId,

      purpose:
        "property_upload",

      amount:
        PROPERTY_UPLOAD_FEE,

      status:
        "verified",

      usedAt: null
    });

  if (!payment) {
    throw new Error(
      "Payment is pending admin verification. You cannot upload the property yet."
    );
  }

  return payment;
}


/* =========================
   CREATE PROPERTY
========================= */

app.post(
  "/api/properties",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !==
        "owner"
      ) {
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

      const payment =
        await requireSubmittedUploadPayment(
          req.user.id,
          transactionId
        );

      const property =
        await Property.create({
          title,
          city,
          location,

          rent:
            Number(rent),

          type,
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
            Array.isArray(
              amenities
            )
              ? amenities.slice(
                  0,
                  30
                )
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
            Boolean(
              powerBackup
            )
        });

      payment.usedAt =
        new Date();

      await payment.save();

      res.status(201).json({
        property
      });
    } catch (e) {
      const msg =
        String(
          e?.message ||
            "Could not create property"
        );

      res
        .status(
          msg.includes(
            "pending admin verification"
          ) ||
          msg.includes("₹250")
            ? 403
            : 500
        )
        .json({
          message: msg
        });
    }
  }
);


/* =========================
   UPDATE PROPERTY
========================= */

app.put(
  "/api/properties/:id",
  auth,
  async (req, res) => {
    try {
      const p =
        await Property.findById(
          req.params.id
        );

      if (!p) {
        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      if (
        String(p.owner) !==
        req.user.id
      ) {
        return res.status(403).json({
          message:
            "Not allowed"
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

      for (
        const key of allowed
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            key
          )
        ) {
          if (
            key === "rent"
          ) {
            const value =
              Number(
                req.body[key]
              );

            if (
              !Number.isFinite(
                value
              ) ||
              value < 0
            ) {
              return res.status(400).json({
                message:
                  "Rent must be a valid non-negative number"
              });
            }

            p.rent =
              value;
          } else if (
            [
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
            ].includes(key)
          ) {
            const value =
              req.body[key];

            p[key] =
              value === "" ||
              value === null ||
              value === undefined
                ? undefined
                : Number(value);
          } else if (
            key ===
            "amenities"
          ) {
            p.amenities =
              Array.isArray(
                req.body[key]
              )
                ? req.body[key].slice(
                    0,
                    30
                  )
                : p.amenities;
          } else if (
            key === "images"
          ) {
            p.images =
              Array.isArray(
                req.body[key]
              )
                ? req.body[key].slice(
                    0,
                    8
                  )
                : p.images;
          } else if (
            [
              "latitude",
              "longitude"
            ].includes(key)
          ) {
            p[key] =
              req.body[key] ===
                "" ||
              req.body[key] ===
                null
                ? undefined
                : Number(
                    req.body[key]
                  );
          } else {
            p[key] =
              req.body[key];
          }
        }
      }

      await p.save();

      res.json({
        property: p
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
    const p =
      await Property.findById(
        req.params.id
      );

    if (!p) {
      return res.status(404).json({
        message:
          "Property not found"
      });
    }

    if (
      String(p.owner) !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          "Not allowed"
      });
    }

    await p.deleteOne();

    res.json({
      message:
        "Property deleted"
    });
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

      const p =
        await Property.findById(
          property
        );

      if (!p) {
        return res.status(404).json({
          message:
            "Property not found"
        });
      }

      if (
        p.available === false
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

      const booking =
        await Booking.create({
          property,
          user: req.user.id,

          moveInDate:
            String(
              moveInDate || ""
            ),

          paymentStatus:
            "submitted",

          receiptNo:
            `HR-${new Date().getFullYear()}-${crypto
              .randomBytes(4)
              .toString("hex")
              .toUpperCase()}`
        });

      const customer =
        await User.findById(
          req.user.id
        ).select("name");

      await notifyAdmin(
        "booking",
        "New Booking Request",
        `${
          customer?.name ||
          "Customer"
        } requested a booking for ${p.title}.`,
        String(
          booking._id
        )
      );

      await booking.populate(
        "property"
      );

      res.status(201).json({
        booking,

        requiresPayment:
          true,

        amount:
          BOOKING_FEE,

        message:
          "Booking created. Complete UPI payment and submit the transaction ID for admin verification."
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
    const bookings =
      await Booking.find({
        user: req.user.id
      }).populate(
        "property"
      );

    res.json({
      bookings
    });
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
        x => x._id
      );

    const bookings =
      await Booking.find({
        property: {
          $in: ids
        }
      })
        .populate(
          "property"
        )
        .populate(
          "user",
          "name email"
        );

    res.json({
      bookings
    });
  }
);


/* =========================
   OWNER BOOKING STATUS
========================= */

app.patch(
  "/api/bookings/:id/status",
  auth,
  async (req, res) => {
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
      String(
        booking.property.owner
      ) !== req.user.id
    ) {
      return res.status(403).json({
        message:
          "Not allowed"
      });
    }

    booking.status =
      req.body.status;

    await booking.save();

    res.json({
      booking
    });
  }
);


/* =========================
   START SERVER
========================= */

async function start() {
  app.listen(
    PORT,
    "0.0.0.0",
    () =>
      console.log(
        `HavenRent API running on ${PORT}`
      )
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
