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

const BOOKING_FEE = Number(process.env.BOOKING_FEE || 499);
const PROPERTY_UPLOAD_FEE = Number(
  process.env.PROPERTY_UPLOAD_FEE || 250
);

const PAYMENT_UPI_ID =
  process.env.PAYMENT_UPI_ID || "9553473078-4@ybl";

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || ""
).toLowerCase().trim();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

const EXTRA_ORIGINS = String(
  process.env.FRONTEND_ORIGINS || ""
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);


/* =========================================================
   SERVICE OPTIONS
========================================================= */

const PROVIDER_SERVICE_OPTIONS = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification",
];

const PROVIDER_SERVICES = PROVIDER_SERVICE_OPTIONS;

const SERVICE_CATALOG = [
  "Home Repairs",
  "Move & Shift",
  "Home Cleaning",
  "Rental Agreement",
  "Tenant Verification",
];


/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "https://haverent.in/admin",
  "https://www.haverent.in",
  "https://haverent.in",
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
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
    ],
  })
);

app.options(/.*/, cors());

app.use(
  express.json({
    limit: "15mb",
  })
);


/* =========================================================
   USER MODEL
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

    phone: {
      type: String,
      default: "",
    },

    verificationStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "verified",
        "rejected",
      ],
      default: "not_required",
    },

    providerServices: {
      type: [String],
      default: [],
    },

    /*
      Provider token is created ONLY after
      admin verifies provider's ₹199 payment.
    */
    providerToken: {
      type: String,
      unique: true,
      sparse: true,
    },

    /*
      Owner token is created during owner registration.
    */
    ownerToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);


/* =========================================================
   PROPERTY MODEL
========================================================= */

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    city: String,

    location: String,

    rent: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      default: "Flat",
    },

    description: String,

    image: String,

    images: {
      type: [String],
      default: [],
    },

    contact: String,

    latitude: Number,

    longitude: Number,

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    available: {
      type: Boolean,
      default: true,
    },

    roomType: {
      type: String,
      default: "",
    },

    occupancy: Number,

    totalRooms: Number,

    availableRooms: Number,

    gender: String,

    furnished: String,

    food: String,

    attachedBathroom: Boolean,

    securityDeposit: Number,

    amenities: {
      type: [String],
      default: [],
    },

    bhk: Number,

    bathrooms: Number,

    balconies: Number,

    areaSqft: Number,

    floor: Number,

    totalFloors: Number,

    facing: String,

    propertyAge: String,

    preferredTenants: String,

    maintenance: Number,

    parking: String,

    lift: Boolean,

    powerBackup: Boolean,
  },
  {
    timestamps: true,
  }
);

const Property = mongoose.model(
  "Property",
  propertySchema
);


/* =========================================================
   BOOKING MODEL
========================================================= */

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
      enum: [
        "pending",
        "confirmed",
        "cancelled",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: [
        "submitted",
        "verified",
        "rejected",
      ],
      default: "submitted",
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    receiptNo: {
      type: String,
      default: "",
    },

    moveInDate: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model(
  "Booking",
  bookingSchema
);


/* =========================================================
   PAYMENT MODEL
========================================================= */

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      enum: [
        "submitted",
        "verified",
        "rejected",
      ],
      default: "submitted",
    },

    purpose: {
      type: String,
      enum: [
        "property_upload",
        "provider_registration",
        "booking",
      ],
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    receiptNo: {
      type: String,
      default: "",
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model(
  "Payment",
  paymentSchema
);


/* =========================================================
   SERVICE REQUEST MODEL
========================================================= */

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
      trim: true,
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

    preferredDate: String,

    preferredTime: String,

    address: String,

    notes: String,

    partnerName: String,

    partnerPhone: String,

    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    quotedPrice: {
      type: Number,
      default: null,
    },

    providerNote: String,
  },
  {
    timestamps: true,
  }
);

const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);


/* =========================================================
   AUTH HELPERS
========================================================= */

function createToken(user) {
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

function auth(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
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
      message: "Invalid or expired token",
    });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    next();
  });
}


/* =========================================================
   BASIC ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({
    name: "HavenRent API",
    status: "online",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "HavenRent API",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post("/api/admin/login", (req, res) => {
  const email = String(
    req.body?.email || ""
  )
    .toLowerCase()
    .trim();

  const password = String(
    req.body?.password || ""
  );

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(503).json({
      message:
        "Admin credentials are not configured on the backend",
    });
  }

  if (
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
      email: ADMIN_EMAIL,
    },
    JWT_SECRET,
    {
      expiresIn: "12h",
    }
  );

  res.json({
    token,
    user: {
      id: "admin",
      name: "HavenRent Admin",
      email: ADMIN_EMAIL,
      role: "admin",
    },
  });
});


/* =========================================================
   REGISTER
========================================================= */

app.post(
  ["/api/auth/register", "/api/register"],
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          message:
            "Database is not connected. Check MongoDB Atlas and Render environment variables.",
        });
      }

      const name = String(
        req.body?.name || ""
      ).trim();

      const email = String(
        req.body?.email || ""
      )
        .toLowerCase()
        .trim();

      const password = String(
        req.body?.password || ""
      );

      const role = String(
        req.body?.role || "customer"
      ).toLowerCase();

      const phone = String(
        req.body?.phone || ""
      ).trim();

      if (!name || !email || !password) {
        return res.status(400).json({
          message:
            "Name, email and password are required",
        });
      }

      const existing = await User.findOne({
        email,
      });

      if (existing) {
        return res.status(409).json({
          message: "Email already registered",
        });
      }

      const safeRole = [
        "customer",
        "owner",
        "provider",
      ].includes(role)
        ? role
        : "customer";

      /*
        PROVIDER SERVICE SELECTION
      */

      let providerServices = [];

      if (safeRole === "provider") {
        providerServices = Array.isArray(
          req.body?.providerServices
        )
          ? [
              ...new Set(
                req.body.providerServices
                  .map((x) =>
                    String(x).trim()
                  )
                  .filter(Boolean)
              ),
            ]
          : [];

        providerServices =
          providerServices.filter((service) =>
            PROVIDER_SERVICE_OPTIONS.includes(
              service
            )
          );

        if (!providerServices.length) {
          return res.status(400).json({
            message:
              "Please select at least one service before creating a provider account",
          });
        }
      }

      const hashedPassword =
        await bcrypt.hash(password, 12);

      /*
        PROVIDER:
        Account created as pending.
        NO provider token is generated here.
      */

      const verificationStatus =
        safeRole === "provider"
          ? "pending"
          : "not_required";

      /*
        OWNER:
        Owner token generated during registration.
      */

      const ownerToken =
        safeRole === "owner"
          ? `OWN-${crypto
              .randomBytes(5)
              .toString("hex")
              .toUpperCase()}`
          : undefined;

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: safeRole,
        phone,
        providerServices,
        verificationStatus,

        /*
          VERY IMPORTANT:
          Provider token remains empty until
          admin verifies ₹199 payment.
        */
        providerToken: undefined,

        ownerToken,
      });

      const token = createToken(user);

      res.status(201).json({
        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          verificationStatus:
            user.verificationStatus,
          providerServices:
            user.providerServices,
          providerToken:
            user.providerToken || "",
          ownerToken:
            user.ownerToken || "",
        },
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
  ["/api/auth/login", "/api/login"],
  async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          message:
            "Database is not connected.",
        });
      }

      const email = String(
        req.body?.email || ""
      )
        .toLowerCase()
        .trim();

      const password = String(
        req.body?.password || ""
      );

      const user = await User.findOne({
        email,
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
            "Invalid email or password",
        });
      }

      const token = createToken(user);

      res.json({
        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          verificationStatus:
            user.verificationStatus,
          providerServices:
            user.providerServices,
          providerToken:
            user.providerToken || "",
          ownerToken:
            user.ownerToken || "",
        },
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  "/api/auth/me",
  auth,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.id
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   SERVICES
========================================================= */

app.get("/api/services", (req, res) => {
  res.json({
    services: SERVICE_CATALOG,
  });
});


/* =========================================================
   PAYMENT CONFIG
========================================================= */

app.get(
  "/api/payments/config",
  (req, res) => {
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

        booking: BOOKING_FEE,
      },
    });
  }
);


/* =========================================================
   MY PAYMENTS
========================================================= */

app.get(
  "/api/payments/my",
  auth,
  async (req, res) => {
    try {
      const payments =
        await Payment.find({
          user: req.user.id,
        })
          .populate("booking")
          .sort({
            createdAt: -1,
          })
          .limit(50);

      res.json({
        payments,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   SUBMIT PAYMENT
========================================================= */

app.post(
  "/api/payments/manual/submit",
  auth,
  async (req, res) => {
    try {
      const purpose = String(
        req.body?.purpose || ""
      ).trim();

      const transactionId = String(
        req.body?.transactionId || ""
      ).trim();

      if (
        ![
          "property_upload",
          "provider_registration",
          "booking",
        ].includes(purpose)
      ) {
        return res.status(400).json({
          message:
            "Invalid payment purpose",
        });
      }

      if (
        transactionId.length < 6 ||
        transactionId.length > 100
      ) {
        return res.status(400).json({
          message:
            "Please enter a valid UPI transaction ID",
        });
      }

      const existingPayment =
        await Payment.findOne({
          transactionId,
        });

      if (existingPayment) {
        return res.status(409).json({
          message:
            "This transaction ID has already been submitted",
        });
      }


      /* OWNER PAYMENT */

      if (
        purpose === "property_upload" &&
        req.user.role !== "owner"
      ) {
        return res.status(403).json({
          message:
            "Only owners can pay this fee",
        });
      }


      /* PROVIDER PAYMENT */

      if (
        purpose === "provider_registration" &&
        req.user.role !== "provider"
      ) {
        return res.status(403).json({
          message:
            "Only providers can pay this fee",
        });
      }


      /* CUSTOMER BOOKING PAYMENT */

      if (
        purpose === "booking" &&
        req.user.role !== "customer"
      ) {
        return res.status(403).json({
          message:
            "Only customers can pay this fee",
        });
      }


      /*
        PROVIDER PAYMENT CHECK

        Service must be selected first.
      */

      if (
        purpose === "provider_registration"
      ) {
        const provider =
          await User.findById(
            req.user.id
          ).select(
            "providerServices verificationStatus providerToken"
          );

        if (
          !provider?.providerServices?.length
        ) {
          return res.status(400).json({
            message:
              "Please select a service before paying the provider registration fee",
          });
        }

        /*
          Already verified?
        */

        if (
          provider.providerToken &&
          provider.verificationStatus ===
            "verified"
        ) {
          return res.status(400).json({
            message:
              "Provider account is already verified",
          });
        }

        /*
          Prevent duplicate pending payment.
        */

        const pendingPayment =
          await Payment.findOne({
            user: req.user.id,
            purpose:
              "provider_registration",
            status: "submitted",
          });

        if (pendingPayment) {
          return res.status(409).json({
            message:
              "Your provider payment is already pending admin verification",
          });
        }
      }


      let booking = null;

      if (purpose === "booking") {
        booking =
          await Booking.findOne({
            _id: req.body?.bookingId,
            user: req.user.id,
          });

        if (!booking) {
          return res.status(404).json({
            message: "Booking not found",
          });
        }
      }


      let amount =
        PROPERTY_UPLOAD_FEE;

      if (
        purpose ===
        "provider_registration"
      ) {
        amount =
          PROVIDER_REGISTRATION_FEE;
      }

      if (purpose === "booking") {
        amount = BOOKING_FEE;
      }


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

          booking: booking
            ? booking._id
            : null,
        });


      if (booking) {
        booking.paymentStatus =
          "submitted";

        booking.paymentId =
          payment._id;

        if (!booking.receiptNo) {
          booking.receiptNo =
            `HR-${new Date().getFullYear()}-${crypto
              .randomBytes(4)
              .toString("hex")
              .toUpperCase()}`;
        }

        await booking.save();
      }


      res.status(201).json({
        submitted: true,
        paymentId:
          payment._id,
        amount,
        purpose,

        message:
          "Payment submitted. Admin verification is required.",
      });
    } catch (error) {
      console.error(
        "PAYMENT ERROR:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   PROVIDER PROFILE
========================================================= */

app.get(
  "/api/providers/me",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "provider") {
        return res.status(403).json({
          message:
            "Provider account required",
        });
      }

      const provider =
        await User.findById(
          req.user.id
        ).select("-password");

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found",
        });
      }

      const payment =
        await Payment.findOne({
          user: req.user.id,
          purpose:
            "provider_registration",
        }).sort({
          createdAt: -1,
        });

      let jobs = [];

      /*
        Jobs visible ONLY after
        provider is verified and token exists.
      */

      if (
        provider.verificationStatus ===
          "verified" &&
        provider.providerToken
      ) {
        jobs =
          await ServiceRequest.find({
            assignedProvider:
              req.user.id,
          })
            .sort({
              createdAt: -1,
            })
            .limit(50)
            .populate(
              "user",
              "name email phone"
            );
      }

      res.json({
        provider,
        payment: payment || null,
        jobs,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   PROVIDER OPEN REQUESTS
========================================================= */

app.get(
  "/api/providers/requests",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "provider") {
        return res.status(403).json({
          message:
            "Provider account required",
        });
      }

      const provider =
        await User.findById(
          req.user.id
        ).select(
          "verificationStatus providerToken providerServices"
        );

      if (
        provider?.verificationStatus !==
        "verified"
      ) {
        return res.status(403).json({
          message:
            "Provider account is waiting for admin verification",
        });
      }

      if (!provider.providerToken) {
        return res.status(403).json({
          message:
            "Provider token has not been generated yet",
        });
      }

      const services =
        provider.providerServices?.length
          ? provider.providerServices
          : PROVIDER_SERVICES;

      const requests =
        await ServiceRequest.find({
          $or: [
            {
              status: "pending",
              service: {
                $in: services,
              },
              assignedProvider: null,
            },

            {
              assignedProvider:
                req.user.id,
            },
          ],
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "user",
            "name email phone"
          );

      res.json({
        requests,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   PROVIDER ACCEPT JOB
========================================================= */

app.patch(
  "/api/providers/requests/:id/accept",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "provider") {
        return res.status(403).json({
          message:
            "Provider account required",
        });
      }

      const provider =
        await User.findById(
          req.user.id
        );

      if (
        provider?.verificationStatus !==
        "verified" ||
        !provider.providerToken
      ) {
        return res.status(403).json({
          message:
            "Provider account is not verified",
        });
      }

      const request =
        await ServiceRequest.findOneAndUpdate(
          {
            _id: req.params.id,
            status: "pending",
            assignedProvider: null,
          },
          {
            assignedProvider:
              req.user.id,

            status: "accepted",

            partnerName:
              req.body?.partnerName ||
              provider.name,

            partnerPhone:
              req.body?.partnerPhone ||
              provider.phone,

            quotedPrice:
              req.body?.quotedPrice !==
                undefined &&
              req.body?.quotedPrice !==
                ""
                ? Number(
                    req.body.quotedPrice
                  )
                : null,
          },
          {
            new: true,
          }
        ).populate(
          "user",
          "name email phone"
        );

      if (!request) {
        return res.status(409).json({
          message:
            "This request was already accepted or is no longer available",
        });
      }

      res.json({
        request,
        message: "Job accepted",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   PROVIDER JOB STATUS
========================================================= */

app.patch(
  "/api/providers/requests/:id/status",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "provider") {
        return res.status(403).json({
          message:
            "Provider account required",
        });
      }

      const provider =
        await User.findById(
          req.user.id
        );

      if (
        provider?.verificationStatus !==
          "verified" ||
        !provider.providerToken
      ) {
        return res.status(403).json({
          message:
            "Provider account is not verified",
        });
      }

      const allowedStatuses = [
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ];

      const status = String(
        req.body?.status || ""
      );

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid provider status",
        });
      }

      const request =
        await ServiceRequest.findOneAndUpdate(
          {
            _id: req.params.id,
            assignedProvider:
              req.user.id,
          },
          {
            status,
          },
          {
            new: true,
          }
        ).populate(
          "user",
          "name email phone"
        );

      if (!request) {
        return res.status(404).json({
          message:
            "Assigned service request not found",
        });
      }

      res.json({
        request,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   CUSTOMER SERVICE REQUEST
========================================================= */

app.post(
  "/api/services/requests",
  auth,
  async (req, res) => {
    try {
      const service = String(
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

      const address = String(
        req.body?.address || ""
      ).trim();

      const notes = String(
        req.body?.notes || ""
      ).trim();

      if (!service) {
        return res.status(400).json({
          message:
            "Service is required",
        });
      }

      if (
        !preferredDate ||
        !preferredTime ||
        !address
      ) {
        return res.status(400).json({
          message:
            "Address, preferred date and preferred time are required",
        });
      }

      const request =
        await ServiceRequest.create({
          user: req.user.id,
          service,
          preferredDate,
          preferredTime,
          address,
          notes,
        });

      res.status(201).json({
        request,
        message:
          "Service request created",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
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
      const requests =
        await ServiceRequest.find({
          user: req.user.id,
        }).sort({
          createdAt: -1,
        });

      res.json({
        requests,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   ADMIN PROVIDERS
========================================================= */

app.get(
  "/api/admin/providers",
  adminAuth,
  async (req, res) => {
    try {
      const providers =
        await User.find({
          role: "provider",
        })
          .select("-password")
          .sort({
            createdAt: -1,
          });

      res.json({
        providers,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   ADMIN PAYMENTS
========================================================= */

app.get(
  "/api/admin/payments",
  adminAuth,
  async (req, res) => {
    try {
      const payments =
        await Payment.find({
          status: "submitted",
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "user",
            "name email phone role providerServices providerToken verificationStatus"
          )
          .populate(
            "booking"
          );

      res.json({
        payments,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   ADMIN VERIFY PAYMENT
========================================================= */

app.patch(
  "/api/admin/payments/:id",
  adminAuth,
  async (req, res) => {
    try {
      const status = String(
        req.body?.status || ""
      );

      if (
        !["verified", "rejected"].includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Status must be verified or rejected",
        });
      }

      const payment =
        await Payment.findById(
          req.params.id
        );

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found",
        });
      }

      payment.status = status;

      if (status === "verified") {
        payment.receiptNo =
          `PAY-${new Date().getFullYear()}-${crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase()}`;
      }

      await payment.save();


      /* =====================================================
         PROVIDER REGISTRATION PAYMENT
         
         THIS IS THE IMPORTANT PART.
         
         ₹199 verified by admin
              ↓
         Provider verified
              ↓
         Unique SP token generated
      ===================================================== */

      if (
        payment.purpose ===
        "provider_registration"
      ) {
        const provider =
          await User.findOne({
            _id: payment.user,
            role: "provider",
          });

        if (provider) {
          if (status === "verified") {

            /*
              Safety check:
              Service must exist.
            */

            if (
              !provider.providerServices ||
              !provider.providerServices.length
            ) {
              return res.status(400).json({
                message:
                  "Provider has not selected a service",
              });
            }


            /*
              Generate token ONLY NOW.
            */

            if (!provider.providerToken) {
              let token;
              let exists = true;

              while (exists) {
                token =
                  `SP-${new Date().getFullYear()}-${crypto
                    .randomBytes(4)
                    .toString("hex")
                    .toUpperCase()}`;

                exists =
                  await User.exists({
                    providerToken:
                      token,
                  });
              }

              provider.providerToken =
                token;
            }


            /*
              Provider becomes verified.
            */

            provider.verificationStatus =
              "verified";

            await provider.save();

          } else {

            /*
              Payment rejected:
              provider stays rejected
              and token is removed.
            */

            provider.verificationStatus =
              "rejected";

            provider.providerToken =
              undefined;

            await provider.save();
          }
        }
      }


      /* =====================================================
         BOOKING PAYMENT
      ===================================================== */

      if (
        payment.purpose === "booking" &&
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

          if (
            !booking.receiptNo &&
            payment.receiptNo
          ) {
            booking.receiptNo =
              payment.receiptNo;
          }

          await booking.save();
        }
      }


      const updatedPayment =
        await Payment.findById(
          payment._id
        )
          .populate(
            "user",
            "name email phone role providerServices providerToken verificationStatus"
          )
          .populate("booking");

      res.json({
        payment: updatedPayment,
        message:
          status === "verified"
            ? "Payment verified successfully"
            : "Payment rejected",
      });
    } catch (error) {
      console.error(
        "ADMIN PAYMENT ERROR:",
        error
      );

      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   ADMIN PROVIDER MANUAL VERIFICATION
========================================================= */

app.patch(
  "/api/admin/providers/:id",
  adminAuth,
  async (req, res) => {
    try {
      const status = String(
        req.body?.verificationStatus ||
          ""
      );

      if (
        ![
          "pending",
          "verified",
          "rejected",
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid verification status",
        });
      }

      const provider =
        await User.findOne({
          _id: req.params.id,
          role: "provider",
        });

      if (!provider) {
        return res.status(404).json({
          message:
            "Provider not found",
        });
      }


      /*
        Admin CANNOT verify provider
        without verified ₹199 payment.
      */

      if (status === "verified") {
        const paid =
          await Payment.findOne({
            user: provider._id,
            purpose:
              "provider_registration",
            status: "verified",
          });

        if (!paid) {
          return res.status(400).json({
            message:
              "Verify the ₹199 provider registration payment before approving this provider",
          });
        }


        if (
          !provider.providerServices ||
          !provider.providerServices.length
        ) {
          return res.status(400).json({
            message:
              "Provider has not selected a service",
          });
        }


        /*
          Generate unique provider token.
        */

        if (!provider.providerToken) {
          let token;
          let exists = true;

          while (exists) {
            token =
              `SP-${new Date().getFullYear()}-${crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase()}`;

            exists =
              await User.exists({
                providerToken:
                  token,
              });
          }

          provider.providerToken =
            token;
        }
      }


      if (status === "rejected") {
        provider.providerToken =
          undefined;
      }

      provider.verificationStatus =
        status;

      await provider.save();

      const safeProvider =
        await User.findById(
          provider._id
        ).select("-password");

      res.json({
        provider: safeProvider,
        message:
          `Provider ${status}`,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   ADMIN SERVICE REQUESTS
========================================================= */

app.get(
  "/api/admin/services/requests",
  adminAuth,
  async (req, res) => {
    try {
      const requests =
        await ServiceRequest.find()
          .sort({
            createdAt: -1,
          })
          .populate(
            "user",
            "name email phone"
          )
          .populate(
            "assignedProvider",
            "name email phone providerToken providerServices"
          );

      res.json({
        requests,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   PROPERTIES
========================================================= */

app.get(
  "/api/properties",
  async (req, res) => {
    try {
      const filter = {};

      if (req.query.city) {
        filter.city = new RegExp(
          String(req.query.city),
          "i"
        );
      }

      if (req.query.type) {
        filter.type =
          String(req.query.type);
      }

      if (req.query.maxRent) {
        filter.rent = {
          $lte: Number(
            req.query.maxRent
          ),
        };
      }

      const properties =
        await Property.find(filter)
          .sort({
            createdAt: -1,
          })
          .populate(
            "owner",
            "name email phone"
          );

      res.json({
        properties,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
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
          "name email phone"
        );

      if (!property) {
        return res.status(404).json({
          message:
            "Property not found",
        });
      }

      res.json({
        property,
      });
    } catch (error) {
      res.status(400).json({
        message:
          "Invalid property id",
      });
    }
  }
);


/* =========================================================
   PROPERTY PAYMENT CHECK
========================================================= */

async function getVerifiedPropertyPayment(
  userId,
  transactionId
) {
  const payment =
    await Payment.findOne({
      user: userId,
      transactionId,
      purpose: "property_upload",
      amount: PROPERTY_UPLOAD_FEE,
      status: "verified",
      usedAt: null,
    });

  if (!payment) {
    throw new Error(
      "Payment is pending admin verification. You cannot upload the property yet."
    );
  }

  return payment;
}


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
            "Only owners can add properties",
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
        powerBackup,
      } = req.body;

      if (
        !title ||
        rent === undefined
      ) {
        return res.status(400).json({
          message:
            "Title and rent are required",
        });
      }

      const payment =
        await getVerifiedPropertyPayment(
          req.user.id,
          transactionId
        );

      const property =
        await Property.create({
          title,
          city,
          location,
          rent: Number(rent),
          type,
          description,
          image,

          images: Array.isArray(images)
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

          owner: req.user.id,

          roomType:
            String(roomType || ""),

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
            String(gender || ""),

          furnished:
            String(furnished || ""),

          food:
            String(food || ""),

          attachedBathroom:
            Boolean(attachedBathroom),

          securityDeposit:
            securityDeposit === "" ||
            securityDeposit == null
              ? undefined
              : Number(securityDeposit),

          amenities:
            Array.isArray(amenities)
              ? amenities.slice(0, 30)
              : [],

          bhk:
            bhk === "" || bhk == null
              ? undefined
              : Number(bhk),

          bathrooms:
            bathrooms === "" ||
            bathrooms == null
              ? undefined
              : Number(bathrooms),

          balconies:
            balconies === "" ||
            balconies == null
              ? undefined
              : Number(balconies),

          areaSqft:
            areaSqft === "" ||
            areaSqft == null
              ? undefined
              : Number(areaSqft),

          floor:
            floor === "" ||
            floor == null
              ? undefined
              : Number(floor),

          totalFloors:
            totalFloors === "" ||
            totalFloors == null
              ? undefined
              : Number(totalFloors),

          facing:
            String(facing || ""),

          propertyAge:
            String(propertyAge || ""),

          preferredTenants:
            String(
              preferredTenants || ""
            ),

          maintenance:
            maintenance === "" ||
            maintenance == null
              ? undefined
              : Number(maintenance),

          parking:
            String(parking || ""),

          lift: Boolean(lift),

          powerBackup:
            Boolean(powerBackup),
        });

      payment.usedAt = new Date();

      await payment.save();

      res.status(201).json({
        property,
      });
    } catch (error) {
      res.status(403).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   BOOKINGS
========================================================= */

app.post(
  "/api/bookings",
  auth,
  async (req, res) => {
    try {
      if (req.user.role !== "customer") {
        return res.status(403).json({
          message:
            "Only customers can request a booking",
        });
      }

      const property =
        await Property.findById(
          req.body?.property
        );

      if (!property) {
        return res.status(404).json({
          message:
            "Property not found",
        });
      }

      if (
        property.available === false
      ) {
        return res.status(409).json({
          message:
            "This property is currently unavailable",
        });
      }

      const existing =
        await Booking.findOne({
          property: property._id,
          user: req.user.id,
          status: {
            $in: [
              "pending",
              "confirmed",
            ],
          },
        });

      if (existing) {
        return res.status(409).json({
          message:
            "You already have an active booking request for this property",
        });
      }

      const booking =
        await Booking.create({
          property: property._id,
          user: req.user.id,
          moveInDate: String(
            req.body?.moveInDate ||
              ""
          ),
          paymentStatus: "submitted",
          receiptNo:
            `HR-${new Date().getFullYear()}-${crypto
              .randomBytes(4)
              .toString("hex")
              .toUpperCase()}`,
        });

      await booking.populate(
        "property"
      );

      res.status(201).json({
        booking,
        requiresPayment: true,
        amount: BOOKING_FEE,

        message:
          "Booking created. Complete UPI payment and submit the transaction ID for admin verification.",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   CUSTOMER BOOKINGS
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
          .sort({
            createdAt: -1,
          });

      res.json({
        bookings,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   CUSTOMER RECEIPT
========================================================= */

app.get(
  "/api/bookings/:id/receipt",
  auth,
  async (req, res) => {
    try {
      const booking =
        await Booking.findOne({
          _id: req.params.id,
          user: req.user.id,
        })
          .populate("property")
          .populate(
            "user",
            "name email phone"
          );

      if (!booking) {
        return res.status(404).json({
          message:
            "Booking not found",
        });
      }

      if (
        booking.paymentStatus !==
        "verified"
      ) {
        return res.status(403).json({
          message:
            "Receipt is available after admin verifies the booking payment",
        });
      }

      const payment =
        await Payment.findOne({
          booking: booking._id,
          status: "verified",
        });

      res.json({
        receipt: {
          receiptNo:
            booking.receiptNo ||
            payment?.receiptNo ||
            "",

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
            payment?.updatedAt ||
            null,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
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
          message:
            "Owner access required",
        });
      }

      const properties =
        await Property.find({
          owner: req.user.id,
        }).select("_id");

      const ids =
        properties.map(
          (x) => x._id
        );

      const bookings =
        await Booking.find({
          property: {
            $in: ids,
          },
        })
          .populate("property")
          .populate(
            "user",
            "name email phone"
          )
          .sort({
            createdAt: -1,
          });

      res.json({
        bookings,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);


/* =========================================================
   START SERVER
========================================================= */

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
      "MONGO_URI is missing. Database features will not work."
    );
    return;
  }

  try {
    await mongoose.connect(
      MONGO_URI,
      {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      }
    );

    console.log(
      "MongoDB connected successfully"
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
  }
}

start();
