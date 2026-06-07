/** Pre-defined admin notification content — in-app, email, and WhatsApp. */

export const ADMIN_NOTIFICATION_TEMPLATES = {
  custom: {
    label: "Custom message",
    description: "Write your own title and message for each channel.",
    app: { title: "", body: "", type: "INFO", link: "" },
    email: { subject: "", text: "", html: "" },
    whatsapp: { message: "" },
  },
  welcome: {
    label: "Welcome — new investor",
    description: "Welcome message after registration.",
    app: {
      title: "Welcome to AKSHYA INVESTMENTS",
      body: "Your account is ready. Complete KYC and explore investment plans to get started.",
      type: "SUCCESS",
      link: "kyc",
    },
    email: {
      subject: "Welcome to AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nWelcome to AKSHYA INVESTMENTS. Log in to complete KYC and explore our investment plans.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Welcome to <strong>AKSHYA INVESTMENTS</strong>. Log in to complete KYC and explore our investment plans.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, welcome to AKSHYA INVESTMENTS. Log in to complete KYC and explore investment plans. — AKSHYA INVESTMENTS",
    },
  },
  kyc_reminder: {
    label: "KYC reminder",
    description: "Prompt investor to complete KYC.",
    app: {
      title: "Complete your KYC",
      body: "Your KYC is pending. Submit identity, bank and payout details to unlock deposits and investments.",
      type: "INFO",
      link: "kyc",
    },
    email: {
      subject: "Complete your KYC — AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nYour KYC on AKSHYA INVESTMENTS is not complete. Log in and finish KYC to unlock deposits, investments and withdrawals.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Your KYC on AKSHYA INVESTMENTS is not complete. Log in and finish KYC (identity, bank &amp; payout) to unlock your dashboard.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, please complete your KYC on AKSHYA INVESTMENTS (ID, bank & payout) to start investing. — AKSHYA INVESTMENTS",
    },
  },
  investment_reminder: {
    label: "Investment reminder",
    description: "Encourage investor to subscribe to a plan.",
    app: {
      title: "Start your investment",
      body: "You have not subscribed to a plan yet. Explore Bronze, Silver, Gold and other plans.",
      type: "INFO",
      link: "invest",
    },
    email: {
      subject: "Start your investment journey — AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nYou registered on AKSHYA INVESTMENTS but have not subscribed to a plan yet. Log in to explore plans with transparent monthly returns.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>You registered on AKSHYA INVESTMENTS but haven't subscribed to a plan yet. Log in to explore Bronze, Silver, Gold and other plans.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, you have not invested yet on AKSHYA INVESTMENTS. Log in to explore our investment plans. — AKSHYA INVESTMENTS",
    },
  },
  deposit_reminder: {
    label: "Deposit reminder",
    description: "Prompt investor to add wallet funds.",
    app: {
      title: "Add funds to your wallet",
      body: "Deposit funds to your wallet to subscribe to investment plans.",
      type: "INFO",
      link: "deposit",
    },
    email: {
      subject: "Add funds to your wallet — AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nAdd funds to your AKSHYA INVESTMENTS wallet to subscribe to a plan. Log in → Deposit to get started.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Add funds to your AKSHYA INVESTMENTS wallet to subscribe to a plan. Go to <strong>Deposit</strong> in your dashboard.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, add funds to your AKSHYA INVESTMENTS wallet to start investing. Log in and use Deposit. — AKSHYA INVESTMENTS",
    },
  },
  roi_reminder: {
    label: "ROI payout reminder",
    description: "Upcoming monthly ROI payout notice.",
    app: {
      title: "Upcoming ROI payout",
      body: "Your monthly ROI payout is scheduled soon. Ensure your payout details are up to date.",
      type: "INFO",
      link: "money",
    },
    email: {
      subject: "Upcoming ROI payout — AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nYour monthly ROI payout on AKSHYA INVESTMENTS is scheduled soon. Log in to review your wallet and payout details.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Your monthly ROI payout is scheduled soon. Log in to review your wallet and payout details.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, your monthly ROI payout on AKSHYA INVESTMENTS is coming soon. Log in to check your wallet. — AKSHYA INVESTMENTS",
    },
  },
  kyc_approved: {
    label: "KYC approved",
    description: "Notify investor that KYC is verified.",
    app: {
      title: "KYC approved",
      body: "Your KYC has been verified. You now have full access to deposits, investments and withdrawals.",
      type: "SUCCESS",
      link: "home",
    },
    email: {
      subject: "KYC verified — AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nYour KYC on AKSHYA INVESTMENTS has been approved. You now have full dashboard access.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Your KYC has been <strong>approved</strong>. You now have full access to deposits, investments and withdrawals.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, your KYC on AKSHYA INVESTMENTS is approved. You can now deposit and invest. — AKSHYA INVESTMENTS",
    },
  },
  kyc_rejected: {
    label: "KYC needs correction",
    description: "Notify investor to fix KYC issues.",
    app: {
      title: "KYC needs correction",
      body: "Your KYC requires updates. Log in to review remarks and resubmit the required sections.",
      type: "WARNING",
      link: "kyc",
    },
    email: {
      subject: "KYC update required — AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nYour KYC on AKSHYA INVESTMENTS needs correction. Log in to review remarks and resubmit.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Your KYC needs correction. Log in to review remarks and resubmit the required sections.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, your KYC on AKSHYA INVESTMENTS needs correction. Log in to review and resubmit. — AKSHYA INVESTMENTS",
    },
  },
  general: {
    label: "General announcement",
    description: "Platform-wide update or notice.",
    app: {
      title: "Message from AKSHYA INVESTMENTS",
      body: "Please log in to your dashboard for an important update.",
      type: "INFO",
      link: "home",
    },
    email: {
      subject: "Message from AKSHYA INVESTMENTS",
      text: "Dear {name},\n\nPlease log in to your AKSHYA INVESTMENTS dashboard for an important update.\n\n— AKSHYA INVESTMENTS Team",
      html: "<p>Dear {name},</p><p>Please log in to your AKSHYA INVESTMENTS dashboard for an important update.</p><p>— AKSHYA INVESTMENTS Team</p>",
    },
    whatsapp: {
      message: "Dear {name}, please log in to AKSHYA INVESTMENTS for an important update. — AKSHYA INVESTMENTS",
    },
  },
};

export function listAdminNotificationTemplates() {
  return Object.entries(ADMIN_NOTIFICATION_TEMPLATES).map(([id, t]) => ({
    id,
    label: t.label,
    description: t.description,
    app: t.app,
    email: { subject: t.email.subject, text: t.email.text, html: t.email.html },
    whatsapp: t.whatsapp,
  }));
}

function personalize(text, name) {
  return String(text || "").replace(/\{name\}/g, name || "Investor");
}

export function resolveNotificationContent(templateId, overrides = {}) {
  const base = ADMIN_NOTIFICATION_TEMPLATES[templateId] || ADMIN_NOTIFICATION_TEMPLATES.custom;
  return {
    app: {
      title: overrides.title ?? overrides.appTitle ?? base.app.title,
      body: overrides.body ?? overrides.appBody ?? base.app.body,
      type: overrides.type ?? base.app.type ?? "INFO",
      link: overrides.link ?? base.app.link ?? null,
    },
    email: {
      subject: overrides.emailSubject ?? overrides.subject ?? base.email.subject,
      text: overrides.emailText ?? overrides.text ?? base.email.text,
      html:
        overrides.emailHtml ??
        overrides.html ??
        (base.email.html ||
          (base.email.text ? base.email.text.split("\n").map((l) => `<p>${l || "&nbsp;"}</p>`).join("") : "")),
    },
    whatsapp: {
      message: overrides.whatsappMessage ?? overrides.whatsappBody ?? base.whatsapp.message,
    },
  };
}

export function personalizeContent(content, name) {
  return {
    app: {
      ...content.app,
      title: personalize(content.app.title, name),
      body: personalize(content.app.body, name),
    },
    email: {
      subject: personalize(content.email.subject, name),
      text: personalize(content.email.text, name),
      html: personalize(content.email.html, name),
    },
    whatsapp: {
      message: personalize(content.whatsapp.message, name),
    },
  };
}
