import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || "development",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  /** All gateway return URLs & webhook registrations use main domain */
  paymentOrigin: process.env.PAYMENT_ORIGIN || process.env.CLIENT_ORIGIN || "http://localhost:5173",
  investPortalUrl: process.env.INVEST_PORTAL_URL || `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/invest`,
  investOrigin: process.env.INVEST_ORIGIN || process.env.CLIENT_ORIGIN || "http://localhost:5173",
  maturityReminderDays: Number(process.env.MATURITY_REMINDER_DAYS || 7),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpires: process.env.JWT_EXPIRES || "7d",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "Akshaya Exim <no-reply@akshayaexim.com>",
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  bank: {
    name: process.env.BANK_NAME || "HDFC Bank",
    accountName: process.env.BANK_ACCOUNT_NAME || "Akshaya Exim Traders",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "50200012345678",
    ifsc: process.env.BANK_IFSC || "HDFC0001234",
    micr: process.env.BANK_MICR || "400240123",
    swift: process.env.BANK_SWIFT || "HDFCINBB",
    branch: process.env.BANK_BRANCH || "Mumbai Main Branch",
  },
  upi: {
    vpa: process.env.UPI_VPA || "akshayaexim@okhdfcbank",
    payeeName: process.env.UPI_PAYEE_NAME || "Akshaya Exim Traders",
  },
  gateways: {
    razorpay: { keyId: process.env.RAZORPAY_KEY_ID || "", keySecret: process.env.RAZORPAY_KEY_SECRET || "" },
    cashfree: { appId: process.env.CASHFREE_APP_ID || "", secret: process.env.CASHFREE_SECRET || "" },
    payu: { key: process.env.PAYU_KEY || "", salt: process.env.PAYU_SALT || "" },
    easebuzz: { key: process.env.EASEBUZZ_KEY || "", salt: process.env.EASEBUZZ_SALT || "" },
    juspay: { apiKey: process.env.JUSPAY_API_KEY || "", merchantId: process.env.JUSPAY_MERCHANT_ID || "" },
    eximpe: { apiKey: process.env.EXIMPE_API_KEY || "" },
  },
  payouts: {
    razorpayx: {
      keyId: process.env.RAZORPAYX_KEY_ID || "",
      keySecret: process.env.RAZORPAYX_KEY_SECRET || "",
      account: process.env.RAZORPAYX_ACCOUNT_NUMBER || "",
    },
    cashfree: {
      clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID || "",
      clientSecret: process.env.CASHFREE_PAYOUT_CLIENT_SECRET || "",
    },
  },
  bankApis: {
    hdfc: {
      clientId: process.env.HDFC_CLIENT_ID || "",
      clientSecret: process.env.HDFC_CLIENT_SECRET || "",
      corporateId: process.env.HDFC_CORPORATE_ID || "",
    },
    axis: {
      clientId: process.env.AXIS_CLIENT_ID || "",
      clientSecret: process.env.AXIS_CLIENT_SECRET || "",
      channelId: process.env.AXIS_CHANNEL_ID || "",
    },
    icici: {
      apiKey: process.env.ICICI_API_KEY || "",
      apiSecret: process.env.ICICI_API_SECRET || "",
      corporateId: process.env.ICICI_CORPORATE_ID || "",
    },
    yesbank: {
      clientId: process.env.YESBANK_CLIENT_ID || "",
      clientSecret: process.env.YESBANK_CLIENT_SECRET || "",
      merchantKey: process.env.YESBANK_MERCHANT_KEY || "",
    },
  },
  seed: {
    superadminEmail: process.env.SUPERADMIN_EMAIL || "superadmin@akshayaexim.com",
    superadminPassword: process.env.SUPERADMIN_PASSWORD || "Admin@12345",
    adminEmail: process.env.ADMIN_EMAIL || "admin@akshayaexim.com",
    adminPassword: process.env.ADMIN_PASSWORD || "Admin@12345",
  },
};
