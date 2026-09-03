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
  process.env.PROVIDER_REGISTRATION_FEE || 199
);

const BOOKING_FEE = Number(
  process.env.BOOKING_FEE || 199
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


const User =
  mongoose.model("User", userSchema);

const Property =
  mongoose.model("Property", propertySchema);

const Booking =
  mongoose.model("Booking", bookingSchema);


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

const Payment =
  mongoose.model("Payment", paymentSchema);


/* =========================
   SERVICE REQUEST SCHEMA
========================= */

const serviceRequestSchema =
  new mongoose.Schema(
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

const ServiceRequest =
  mongoose.model(
    "ServiceRequest",
    serviceRequestSchema
  );


/* =========================
   AUTH HELPERS
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
    req.user =
      jwt.verify(token, JWT_SECRET);

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
      String(req.body?.password || "");

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
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

    const token =
      jwt.sign(
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
   HEALTH
========================= */

app.get(
  "/",
  (_, res) =>
    res.json({
      name: "HavenRent API",
      status: "online"
    })
);

app.get(
  "/api/health",
  (_, res) =>
    res.json({
      ok: true,
      service: "HavenRent API",

      database:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected"
    })
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

      if (!name || !email || !password) {
        return res.status(400).json({
          message:
            "Name, email and password are required"
        });
      }

      if (
        await User.findOne({
          email: email.toLowerCase()
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
    try {
      if (req.user.role === "admin") {
        return res.json({
          user: {
            id: "admin",
            email: ADMIN_EMAIL,
            role: "admin",
            name: "HavenRent Admin"
          }
        });
      }

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
   PROPERTIES
========================= */

app.get(
  "/api/properties",
  async (req, res) => {
    try {
      const filter = {};

      if (
        req.query.city &&
        String(req.query.city).trim()
      ) {
        filter.city = new RegExp(
          String(req.query.city).trim(),
          "i"
        );
      }

      if (
        req.query.type &&
        String(req.query.type).trim()
      ) {
        filter.type = new RegExp(
          String(req.query.type).trim(),
          "i"
        );
      }

      if (
        req.query.available !== undefined
      ) {
        filter.available =
          String(
            req.query.available
          ) !== "false";
      }

      const properties =
        await Property.find(filter)
          .populate(
            "owner",
            "name email phone ownerToken"
          )
          .sort({
            createdAt: -1
          });

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
      const property =
        await Property.findById(
          req.params.id
        ).populate(
          "owner",
          "name email phone ownerToken"
        );

      if (!property) {
        return res.status(404).json({
          message: "Property not found"
        });
      }

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
   PAYMENT CONFIG
========================= */

app.get(
  "/api/payments/config",
  (req, res) => {
    res.json({
      enabled: Boolean(PAYMENT_UPI_ID),

      upiId:
        PAYMENT_UPI_ID,

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
          });

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
   MANUAL PAYMENT SUBMIT
========================= */

app.post(
  "/api/payments/manual/submit",
  auth,
  async (req, res) => {
    try {
      const {
        purpose,
        transactionId,
        bookingId
      } = req.body;

      if (
        !purpose ||
        !transactionId
      ) {
        return res.status(400).json({
          message:
            "Payment purpose and transaction ID are required"
        });
      }

      const allowedPurposes = [
        "property_upload",
        "provider_registration",
        "booking"
      ];

      if (
        !allowedPurposes.includes(
          purpose
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment purpose"
        });
      }

      const existing =
        await Payment.findOne({
          transactionId:
            String(transactionId).trim()
        });

      if (existing) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted"
        });
      }

      let amount =
        PROPERTY_UPLOAD_FEE;

      if (
        purpose ===
        "provider_registration"
      ) {
        if (
          req.user.role !== "provider"
        ) {
          return res.status(403).json({
            message:
              "Only provider accounts can submit provider registration payment"
          });
        }

        amount =
          PROVIDER_REGISTRATION_FEE;
      }

      let booking = null;

      if (purpose === "booking") {
        if (
          req.user.role !== "customer"
        ) {
          return res.status(403).json({
            message:
              "Only customers can submit booking payments"
          });
        }

        if (!bookingId) {
          return res.status(400).json({
            message:
              "bookingId is required for booking payment"
          });
        }

        booking =
          await Booking.findOne({
            _id: bookingId,
            user: req.user.id
          });

        if (!booking) {
          return res.status(404).json({
            message:
              "Booking not found"
          });
        }

        if (
          booking.paymentStatus ===
          "verified"
        ) {
          return res.status(409).json({
            message:
              "Booking payment is already verified"
          });
        }

        amount = BOOKING_FEE;
      }

      const orderId =
        `HR-${Date.now()}-${crypto
          .randomBytes(4)
          .toString("hex")
          .toUpperCase()}`;

      const payment =
        await Payment.create({
          user: req.user.id,

          orderId,

          transactionId:
            String(
              transactionId
            ).trim(),

          amount,

          currency: "INR",

          status: "submitted",

          purpose,

          booking:
            booking?._id || null
        });

      if (booking) {
        booking.paymentId =
          payment._id;

        booking.paymentStatus =
          "submitted";

        await booking.save();
      }

      res.status(201).json({
        payment,

        message:
          "Payment submitted successfully. Admin verification is pending."
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
  async (_req, res) => {
    res.json({
      services: [
        "Cleaning",
        "Plumbing",
        "Electrical",
        "Painting",
        "AC Service",
        "Carpentry",
        "Pest Control",
        "Moving"
      ]
    });
  }
);


app.post(
  "/api/services",
  auth,
  async (req, res) => {
    try {
      const {
        service,
        preferredDate,
        preferredTime,
        address,
        notes
      } = req.body;

      if (!service) {
        return res.status(400).json({
          message:
            "Service is required"
        });
      }

      const request =
        await ServiceRequest.create({
          user: req.user.id,
          service,
          preferredDate,
          preferredTime,
          address,
          notes
        });

      res.status(201).json({
        request
      });
    } catch (e) {
      res.status(500).json({
        message: e.message
      });
    }
  }
);


app.get(
  "/api/services/my",
  auth,
  async (req, res) => {
    try {
      const requests =
        await ServiceRequest.find({
          user: req.user.id
        })
          .populate(
            "assignedProvider",
            "name phone email providerServices"
          )
          .sort({
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
  "/api/services/:id/cancel",
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
      req.user.role !== "provider"
    ) {
      return res.status(403).json({
        message:
          "Provider access required"
      });
    }

    const provider =
      await User.findById(
        req.user.id
      ).select("-password");

    res.json({
      provider
    });
  }
);


app.get(
  "/api/providers/requests",
  auth,
  async (req, res) => {
    if (
      req.user.role !== "provider"
    ) {
      return res.status(403).json({
        message:
          "Provider access required"
      });
    }

    const provider =
      await User.findById(
        req.user.id
      );

    if (
      !provider ||
      provider.verificationStatus !==
        "verified"
    ) {
      return res.status(403).json({
        message:
          "Provider must be verified by admin"
      });
    }

    const requests =
      await ServiceRequest.find({
        $or: [
          {
            assignedProvider:
              req.user.id
          },
          {
            assignedProvider: null,
            status: "pending"
          }
        ]
      })
        .populate(
          "user",
          "name email phone"
        )
        .sort({
          createdAt: -1
        });

    res.json({
      requests
    });
  }
);


app.patch(
  "/api/providers/requests/:id/accept",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !== "provider"
      ) {
        return res.status(403).json({
          message:
            "Provider access required"
        });
      }

      const provider =
        await User.findById(
          req.user.id
        );

      if (
        !provider ||
        provider.verificationStatus !==
          "verified"
      ) {
        return res.status(403).json({
          message:
            "Provider must be verified by admin"
        });
      }

      const request =
        await ServiceRequest.findById(
          req.params.id
        );

      if (!request) {
        return res.status(404).json({
          message:
            "Service request not found"
        });
      }

      if (
        request.assignedProvider &&
        String(
          request.assignedProvider
        ) !== req.user.id
      ) {
        return res.status(409).json({
          message:
            "This request is already assigned"
        });
      }

      request.assignedProvider =
        req.user.id;

      request.status =
        "accepted";

      request.partnerName =
        provider.name;

      request.partnerPhone =
        provider.phone;

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


app.patch(
  "/api/providers/requests/:id/status",
  auth,
  async (req, res) => {
    try {
      if (
        req.user.role !== "provider"
      ) {
        return res.status(403).json({
          message:
            "Provider access required"
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
            "Invalid service status"
        });
      }

      const request =
        await ServiceRequest.findOne({
          _id: req.params.id,
          assignedProvider:
            req.user.id
        });

      if (!request) {
        return res.status(404).json({
          message:
            "Assigned service request not found"
        });
      }

      request.status =
        status;

      if (
        req.body?.quotedPrice !==
        undefined
      ) {
        const price =
          Number(
            req.body.quotedPrice
          );

        if (
          Number.isFinite(price) &&
          price >= 0
        ) {
          request.quotedPrice =
            price;
        }
      }

      if (
        req.body?.providerNote !==
        undefined
      ) {
        request.providerNote =
          String(
            req.body.providerNote
          );
      }

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
   ADMIN PROVIDERS
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


app.patch(
  "/api/admin/providers/:id",
  adminAuth,
  async (req, res) => {
    try {
      const provider =
        await User.findOne({
          _id: req.params.id,
          role: "provider"
        });

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found"
        });
      }

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

      if (status === "verified") {
        const payment =
          await Payment.findOne({
            user: provider._id,
            purpose:
              "provider_registration",
            amount:
              PROVIDER_REGISTRATION_FEE,
            status: "verified"
          });

        if (!payment) {
          return res.status(400).json({
            message:
              "Provider registration payment must be verified before approving provider"
          });
        }
      }

      provider.verificationStatus =
        status;

      await provider.save();

      res.json({
        provider: {
          id: provider._id,
          name: provider.name,
          email: provider.email,
          role: provider.role,
          verificationStatus:
            provider.verificationStatus
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
   ADMIN SERVICES
========================= */

app.get(
  "/api/admin/services",
  adminAuth,
  async (_req, res) => {
    try {
      const requests =
        await ServiceRequest.find({})
          .populate(
            "user",
            "name email phone"
          )
          .populate(
            "assignedProvider",
            "name email phone"
          )
          .sort({
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
   ADMIN PAYMENTS
========================= */

app.get(
  "/api/admin/payments",
  adminAuth,
  async (req, res) => {
    try {
      const payments =
        await Payment.find({})
          .populate(
            "user",
            "name email role phone"
          )
          .populate(
            "booking",
            "property user status paymentStatus receiptNo moveInDate"
          )
          .sort({
            createdAt: -1
          });

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
            "Payment status must be verified or rejected"
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
          "provider_registration" &&
        status === "verified"
      ) {
        await User.findByIdAndUpdate(
          payment.user,
          {
            $set: {
              verificationStatus:
                "pending"
            }
          }
        );
      }

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
          .populate(
            "booking"
          );

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
   BOOKING RECEIPT
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
          booking: booking._id,
          status: "verified"
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
   PROPERTY PAYMENT CHECK
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

      status: "verified",

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
        req.user.role !== "owner"
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
              : Number(availableRooms),

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
   EDIT PROPERTY
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

            p.rent = value;
          }

          else if (
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
          }

          else if (
            key === "amenities"
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
          }

          else if (
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
          }

          else if (
            [
              "latitude",
              "longitude"
            ].includes(key)
          ) {
            p[key] =
              req.body[key] === "" ||
              req.body[key] === null
                ? undefined
                : Number(
                    req.body[key]
                  );
          }

          else {
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
   CUSTOMER BOOKINGS
========================= */

app.get(
  "/api/bookings/my",
  auth,
  async (req, res) => {
    const bookings =
      await Booking.find({
        user: req.user.id
      })
        .populate("property")
        .sort({
          createdAt: -1
        });

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
        .populate("property")
        .populate(
          "user",
          "name email"
        )
        .sort({
          createdAt: -1
        });

    res.json({
      bookings
    });
  }
);


/* =========================
   OWNER UPDATE BOOKING
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

    const allowedStatuses = [
      "pending",
      "confirmed",
      "cancelled"
    ];

    const status =
      String(
        req.body?.status || ""
      );

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid booking status"
      });
    }

    booking.status =
      status;

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
