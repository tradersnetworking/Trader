import { investDb } from "../db.js";
import { hashPassword } from "../utils/auth.js";
import { maturityDate, validateSettlementCycle, lockInDaysFromMonths } from "../utils/invest.js";
import { validateAdminMonthlyRoi, validateAdminLockInDays } from "../utils/adminRoiLimits.js";
import { addLedger } from "../routes/investInvestor.js";
import { notifyInvestor } from "./notifications.js";
import { notifyInvestmentActivity } from "./investNotifications.js";
import { sendMail } from "../utils/mailer.js";
import { creditReferralOnInvestment } from "./referral.js";
import { generateSubscriptionAgreement } from "./agreements.js";
import { logAudit } from "./auditLog.js";
import { purgeAgreementsForSubscription } from "./agreements.js";

function fmtInr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

async function sendPayoutNotice(investor, { title, body, amount, kind }) {
  await notifyInvestor(investor.id, title, body, { type: "INFO", link: "money" });
  if (investor.email) {
    await sendMail({
      to: investor.email,
      subject: title,
      text: `${body}\n\nAmount: ${fmtInr(amount)}\nType: ${kind}\n\nThis is a prior notice before the payout is processed.`,
      html: `<p>${body}</p><p><strong>Amount:</strong> ${fmtInr(amount)}</p><p><em>This is a prior notice. Your account will be updated once admin confirms the payout.</em></p>`,
    }).catch(() => {});
  }
}

export async function createInvestorFull(body, actor) {
  const {
    email, name, password, phone,
    upiId, bankName, accountNumber, ifsc,
    kyc: kycInput,
    initialDeposit,
    autoApproveKyc = true,
  } = body;

  if (!email || !name || !password) throw new Error("Email, name and password are required");
  const normalized = String(email).toLowerCase().trim();
  if (await investDb.investor.findUnique({ where: { email: normalized } })) {
    throw new Error("Email already registered");
  }

  const inv = await investDb.investor.create({
    data: {
      email: normalized,
      name: String(name).trim(),
      phone: phone || null,
      passwordHash: hashPassword(password),
      role: "INVESTOR",
      upiId: upiId || null,
      bankName: bankName || null,
      accountNumber: accountNumber || null,
      ifsc: ifsc || null,
    },
  });
  await investDb.wallet.create({ data: { investorId: inv.id } });

  const kycStatus = autoApproveKyc ? "APPROVED" : "PENDING";
  await investDb.kyc.create({
    data: {
      investorId: inv.id,
      fullName: kycInput?.fullName || name,
      phone: kycInput?.phone || phone || null,
      panNumber: kycInput?.panNumber || null,
      aadhaarNumber: kycInput?.aadhaarNumber || null,
      bankName: kycInput?.bankName || bankName || null,
      bankAccount: kycInput?.bankAccount || accountNumber || null,
      ifscCode: kycInput?.ifscCode || ifsc || null,
      upiId: kycInput?.upiId || upiId || null,
      address: kycInput?.address || null,
      status: kycStatus,
      verifiedAt: kycStatus === "APPROVED" ? new Date() : null,
    },
  });

  if (initialDeposit && Number(initialDeposit) > 0) {
    const amt = Number(initialDeposit);
    await investDb.wallet.update({ where: { investorId: inv.id }, data: { available: { increment: amt } } });
    await addLedger(inv.id, { type: "DEPOSIT", direction: "CREDIT", amount: amt, note: "Admin initial deposit on account creation" });
    const { creditPlatformCommissionOnDeposit } = await import("./platformCommission.js");
    await creditPlatformCommissionOnDeposit(inv.id, amt, `admin-create-${inv.id}`).catch(() => {});
  }

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "INVESTOR_CREATE_FULL",
    entity: "Investor",
    entityId: inv.id,
  });

  const { passwordHash, ...user } = inv;
  return { investor: user };
}

export async function updateInvestorFull(investorId, body, actor) {
  const inv = await investDb.investor.findUnique({ where: { id: investorId } });
  if (!inv || inv.role !== "INVESTOR") throw new Error("Investor not found");

  const investorData = {};
  if (body.name != null) investorData.name = String(body.name).trim();
  if (body.phone != null) investorData.phone = body.phone || null;
  if (body.upiId != null) investorData.upiId = body.upiId || null;
  if (body.bankName != null) investorData.bankName = body.bankName || null;
  if (body.accountNumber != null) investorData.accountNumber = body.accountNumber || null;
  if (body.ifsc != null) investorData.ifsc = body.ifsc || null;
  if (body.isActive != null) investorData.isActive = Boolean(body.isActive);

  if (Object.keys(investorData).length) {
    await investDb.investor.update({ where: { id: investorId }, data: investorData });
  }

  if (body.kyc) {
    const k = body.kyc;
    await investDb.kyc.upsert({
      where: { investorId },
      create: {
        investorId,
        fullName: k.fullName || inv.name,
        phone: k.phone || body.phone,
        panNumber: k.panNumber,
        aadhaarNumber: k.aadhaarNumber,
        bankName: k.bankName || body.bankName,
        bankAccount: k.bankAccount || body.accountNumber,
        ifscCode: k.ifscCode || body.ifsc,
        upiId: k.upiId || body.upiId,
        address: k.address,
        status: k.status || "APPROVED",
        verifiedAt: k.status === "APPROVED" ? new Date() : null,
      },
      update: {
        ...(k.fullName != null && { fullName: k.fullName }),
        ...(k.phone != null && { phone: k.phone }),
        ...(k.panNumber != null && { panNumber: k.panNumber }),
        ...(k.aadhaarNumber != null && { aadhaarNumber: k.aadhaarNumber }),
        ...(k.bankName != null && { bankName: k.bankName }),
        ...(k.bankAccount != null && { bankAccount: k.bankAccount }),
        ...(k.ifscCode != null && { ifscCode: k.ifscCode }),
        ...(k.upiId != null && { upiId: k.upiId }),
        ...(k.address != null && { address: k.address }),
        ...(k.status != null && {
          status: k.status,
          verifiedAt: k.status === "APPROVED" ? new Date() : null,
          remarks: k.status === "NOT_SUBMITTED" ? null : undefined,
        }),
      },
    });
    if (k.status === "APPROVED") {
      const { autoGenerateAndSignInvestorAgreements } = await import("./agreements.js");
      await autoGenerateAndSignInvestorAgreements(investorId, {
        ipAddress: "admin-panel",
        userAgent: "admin-investor-update",
        triggerEvent: "admin_kyc_approved",
      }).catch(() => {});
    }
  }

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "INVESTOR_UPDATE_FULL",
    entity: "Investor",
    entityId: investorId,
  });

  return investDb.investor.findUnique({
    where: { id: investorId },
    include: { wallet: true, kyc: true },
  });
}

export async function adminAssignSubscription(investorId, body, actor) {
  const {
    planId,
    amount,
    settlementCycle,
    customMonthlyRoiPct,
    customLockInDays,
    customLockInMonths,
    roiOverrideNote,
    skipBalanceCheck,
  } = body;
  const plan = await investDb.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new Error("Plan not available");

  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error("Invalid investment amount");
  if (actor?.role !== "SUPERADMIN") {
    if (amt < plan.minInvestment || amt > plan.maxInvestment) {
      throw new Error(`Amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`);
    }
  }

  let lockInDays = Number(plan.lockInDays);
  if (customLockInDays != null) {
    lockInDays = validateAdminLockInDays(Number(customLockInDays), actor);
  } else if (customLockInMonths != null) {
    lockInDays = validateAdminLockInDays(lockInDaysFromMonths(Number(customLockInMonths)), actor);
  }

  const wallet = await investDb.wallet.findUnique({ where: { investorId } });
  if (!wallet) throw new Error("Wallet not found");

  let adminTopUp = 0;
  if (skipBalanceCheck && wallet.available < amt) {
    adminTopUp = amt - wallet.available;
    await investDb.wallet.update({ where: { investorId }, data: { available: { increment: adminTopUp } } });
    await addLedger(investorId, { type: "DEPOSIT", direction: "CREDIT", amount: adminTopUp, note: "Admin funded for plan assignment" });
  } else if (!skipBalanceCheck && wallet.available < amt) {
    throw new Error("Insufficient available balance. Credit wallet first or enable skip balance check.");
  }

  const monthlyRoi =
    customMonthlyRoiPct != null
      ? validateAdminMonthlyRoi(customMonthlyRoiPct, actor)
      : Number(plan.monthlyRoiPct);
  const cycleCheck = validateSettlementCycle(plan, settlementCycle);
  if (!cycleCheck.ok) throw new Error(cycleCheck.error);
  const start = new Date();
  const hasCustomTerms =
    customMonthlyRoiPct != null || customLockInDays != null || customLockInMonths != null;

  const sub = await investDb.subscription.create({
    data: {
      investorId,
      planId: plan.id,
      amount: amt,
      settlementCycle: cycleCheck.cycle,
      monthlyRoiPct: monthlyRoi,
      roiOverrideNote: hasCustomTerms
        ? roiOverrideNote || `Admin custom terms by ${actor?.name || "admin"}`
        : null,
      lockInDays,
      startDate: start,
      maturityDate: maturityDate(start, lockInDays),
      status: "ACTIVE",
    },
  });

  await addLedger(investorId, { type: "INVESTMENT", direction: "DEBIT", amount: amt, reference: sub.id, note: `Admin assigned: ${plan.name}` });
  await investDb.wallet.update({
    where: { investorId },
    data: { available: { decrement: amt }, invested: { increment: amt } },
  });

  await creditReferralOnInvestment(investorId, amt, sub.id).catch(() => {});
  const { creditPlatformCommissionOnInvestment, creditPlatformCommissionOnDeposit } = await import("./platformCommission.js");
  await creditPlatformCommissionOnInvestment(investorId, amt, sub.id).catch(() => {});
  if (adminTopUp > 0) {
    await creditPlatformCommissionOnDeposit(investorId, adminTopUp, `admin-topup-${sub.id}`).catch(() => {});
  }

  try {
    await generateSubscriptionAgreement(investorId, sub.id, { ipAddress: "admin", userAgent: "admin-panel" });
  } catch {
    /* non-fatal */
  }

  await notifyInvestor(investorId, "Investment assigned", `An investment of ${fmtInr(amt)} in ${plan.name} was set up on your account.`, { type: "SUCCESS", link: "investments" });
  const investor = await investDb.investor.findUnique({ where: { id: investorId } });
  notifyInvestmentActivity(investor, { planName: plan.name, amount: amt, settlementCycle: sub.settlementCycle, source: "admin" });

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "ADMIN_ASSIGN_SUBSCRIPTION",
    entity: "Subscription",
    entityId: sub.id,
    meta: JSON.stringify({ investorId, amount: amt, monthlyRoi }),
  });

  return sub;
}

export async function updateSubscriptionRoi(
  subscriptionId,
  { monthlyRoiPct, roiOverrideNote, lockInDays, lockInMonths },
  actor
) {
  const sub = await investDb.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true, investor: true } });
  if (!sub) throw new Error("Subscription not found");
  const pct = validateAdminMonthlyRoi(monthlyRoiPct, actor);

  const data = {
    monthlyRoiPct: pct,
    roiOverrideNote: roiOverrideNote || `Admin adjusted from ${sub.plan?.monthlyRoiPct}%`,
  };
  if (lockInDays != null || lockInMonths != null) {
    const days =
      lockInDays != null
        ? validateAdminLockInDays(Number(lockInDays), actor)
        : validateAdminLockInDays(lockInDaysFromMonths(Number(lockInMonths)), actor);
    data.lockInDays = days;
    data.maturityDate = maturityDate(sub.startDate, days);
  }

  const updated = await investDb.subscription.update({
    where: { id: subscriptionId },
    data,
  });

  await notifyInvestor(sub.investorId, "ROI rate updated", `Your ${sub.plan?.name || "investment"} monthly return is now ${pct}%.`, { type: "INFO", link: "investments" });

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "SUBSCRIPTION_ROI_UPDATE",
    entity: "Subscription",
    entityId: subscriptionId,
    meta: JSON.stringify({ monthlyRoiPct: pct }),
  });

  return updated;
}

export async function scheduleManualPayout(body, actor) {
  const { investorId, amount, payoutKind, mode, remarks, subscriptionId } = body;
  const inv = await investDb.investor.findUnique({ where: { id: investorId } });
  if (!inv) throw new Error("Investor not found");

  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error("Invalid amount");

  const kind = payoutKind || "WITHDRAWAL";
  const payoutMode = (mode || "UPI").toUpperCase() === "BANK" ? "BANK" : "UPI";
  const destination = kind === "WITHDRAWAL"
    ? (payoutMode === "UPI" ? inv.upiId : inv.accountNumber)
    : "WALLET";

  if (kind === "WITHDRAWAL" && !destination) {
    throw new Error(`Investor has no ${payoutMode} details on file`);
  }

  const title = kind === "ROI_RETURN" || kind === "MANUAL_CREDIT"
    ? `Upcoming profit credit: ${fmtInr(amt)}`
    : `Upcoming payout: ${fmtInr(amt)}`;

  const noticeBody = kind === "ROI_RETURN" || kind === "MANUAL_CREDIT"
    ? `You will receive a profit/return credit of ${fmtInr(amt)} on your investment account.`
    : `A withdrawal of ${fmtInr(amt)} to your ${payoutMode} account is scheduled.`;

  await sendPayoutNotice(inv, { title, body: noticeBody, amount: amt, kind });

  const payout = await investDb.payout.create({
    data: {
      investorId,
      amount: amt,
      mode: kind === "WITHDRAWAL" ? payoutMode : "WALLET",
      destination: destination || "WALLET",
      status: "SCHEDULED",
      payoutKind: kind,
      noticeSentAt: new Date(),
      scheduledById: actor?.id || null,
      remarks: remarks || null,
      reference: subscriptionId || null,
    },
  });

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "PAYOUT_SCHEDULED",
    entity: "Payout",
    entityId: payout.id,
  });

  return payout;
}

export async function completeScheduledPayout(payoutId, actor) {
  const payout = await investDb.payout.findUnique({ where: { id: payoutId }, include: { investor: true } });
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "SCHEDULED") throw new Error("Payout is not in scheduled state");

  const wallet = await investDb.wallet.findUnique({ where: { investorId: payout.investorId } });
  if (!wallet) throw new Error("Wallet not found");

  const kind = payout.payoutKind || "WITHDRAWAL";

  if (kind === "WITHDRAWAL") {
    if (wallet.available < payout.amount) throw new Error("Insufficient available balance");
    await investDb.wallet.update({
      where: { investorId: payout.investorId },
      data: { available: { decrement: payout.amount } },
    });
    await addLedger(payout.investorId, {
      type: "PAYOUT",
      direction: "DEBIT",
      amount: payout.amount,
      reference: payout.id,
      note: payout.remarks || "Manual withdrawal completed by admin",
    });
  } else {
    await investDb.wallet.update({
      where: { investorId: payout.investorId },
      data: { earnings: { increment: payout.amount } },
    });
    await addLedger(payout.investorId, {
      type: "RETURN",
      direction: "CREDIT",
      amount: payout.amount,
      reference: payout.reference || payout.id,
      note: payout.remarks || "Manual profit return credited by admin",
    });
  }

  const updated = await investDb.payout.update({
    where: { id: payoutId },
    data: { status: "SUCCESS", completedAt: new Date(), gatewayRef: "MANUAL" },
  });

  await notifyInvestor(
    payout.investorId,
    kind === "WITHDRAWAL" ? "Payout completed" : "Profit credited",
    kind === "WITHDRAWAL"
      ? `Your payout of ${fmtInr(payout.amount)} has been processed.`
      : `${fmtInr(payout.amount)} has been credited to your earnings.`,
    { type: "SUCCESS", link: "money" }
  );

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "PAYOUT_COMPLETED",
    entity: "Payout",
    entityId: payoutId,
  });

  return updated;
}

export async function cancelScheduledPayout(payoutId, actor) {
  const payout = await investDb.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "SCHEDULED") throw new Error("Only scheduled payouts can be cancelled");

  const updated = await investDb.payout.update({
    where: { id: payoutId },
    data: { status: "CANCELLED", remarks: (payout.remarks || "") + " [Cancelled by admin]" },
  });

  await notifyInvestor(payout.investorId, "Scheduled payout cancelled", `A scheduled payout of ${fmtInr(payout.amount)} was cancelled.`, { type: "INFO", link: "money" });

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "PAYOUT_CANCELLED",
    entity: "Payout",
    entityId: payoutId,
  });

  return updated;
}

export const ADMIN_KYC_FILE_FIELDS = [
  "panDocument",
  "aadhaarDocument",
  "aadhaarFront",
  "aadhaarBack",
  "photo",
  "selfie",
  "addressProof",
  "signature",
  "cancelledCheque",
  "passbookDocument",
  "bankStatementDocument",
  "passportDocument",
  "driversLicenseDocument",
];

export async function adminUpsertInvestorKyc(investorId, body, files = {}, actor) {
  const { fileUrl } = await import("../utils/upload.js");
  const { parseKycBody } = await import("../utils/kycFields.js");
  const inv = await investDb.investor.findUnique({ where: { id: investorId } });
  if (!inv || inv.role !== "INVESTOR") throw new Error("Investor not found");
  const existing = await investDb.kyc.findUnique({ where: { investorId } });

  const status = String(body.status || existing?.status || "APPROVED").toUpperCase();
  const data = {
    ...parseKycBody(body, existing),
    status,
    verifiedAt: status === "APPROVED" ? new Date() : null,
    remarks: body.remarks !== undefined ? (body.remarks || null) : existing?.remarks ?? null,
  };
  if (body.panNumber != null) data.panNumber = String(body.panNumber).trim().toUpperCase();
  if (body.aadhaarNumber != null) data.aadhaarNumber = String(body.aadhaarNumber).replace(/\s/g, "");
  if (body.bankProofType) data.bankProofType = String(body.bankProofType).toUpperCase();

  for (const field of ADMIN_KYC_FILE_FIELDS) {
    if (files[field]?.[0]) data[field] = fileUrl(files[field][0].filename);
    else if (existing?.[field]) data[field] = existing[field];
  }

  const { applyStagedUploadsToKycData, markStagedUploadsAttached } = await import("./kycDocumentUploads.js");
  await applyStagedUploadsToKycData(investorId, data, files);

  const kyc = await investDb.kyc.upsert({
    where: { investorId },
    create: { investorId, ...data },
    update: data,
  });

  const investorPatch = {};
  if (body.name != null) investorPatch.name = String(body.name).trim();
  if (body.phone != null) investorPatch.phone = body.phone || null;
  if (body.upiId != null) investorPatch.upiId = body.upiId || null;
  if (body.bankName != null) investorPatch.bankName = body.bankName || null;
  if (body.accountNumber != null) investorPatch.accountNumber = body.accountNumber || null;
  if (body.ifsc != null) investorPatch.ifsc = body.ifsc || null;
  if (Object.keys(investorPatch).length) {
    await investDb.investor.update({ where: { id: investorId }, data: investorPatch });
  }

  await markStagedUploadsAttached(investorId);

  if (status === "APPROVED") {
    const { autoGenerateAndSignInvestorAgreements } = await import("./agreements.js");
    await autoGenerateAndSignInvestorAgreements(investorId, {
      ipAddress: "admin-panel",
      userAgent: "admin-kyc-upsert",
      triggerEvent: "admin_kyc_approved",
    }).catch(() => {});
  }

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "ADMIN_KYC_UPSERT",
    entity: "Kyc",
    entityId: kyc.id,
    meta: JSON.stringify({ investorId, status }),
  });

  const row = await investDb.investor.findUnique({
    where: { id: investorId },
    include: { wallet: true, kyc: true },
  });
  const { passwordHash, resetToken, totpSecret, backupCodes, ...user } = row;
  return user;
}

export async function adminResetKyc(investorId, actor) {
  const inv = await investDb.investor.findUnique({ where: { id: investorId }, include: { kyc: true } });
  if (!inv || inv.role !== "INVESTOR") throw new Error("Investor not found");
  if (inv.kyc) {
    await investDb.kyc.delete({ where: { investorId } });
  }
  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "KYC_RESET",
    entity: "Kyc",
    entityId: investorId,
  });
  await notifyInvestor(investorId, "KYC reset", "Your KYC record was reset by the team. Please complete KYC again.", { type: "INFO", link: "kyc" });
  return { ok: true };
}

export async function adminCancelSubscription(subscriptionId, actor, { reason, refundPrincipal = true } = {}) {
  const sub = await investDb.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, investor: true },
  });
  if (!sub) throw new Error("Subscription not found");
  if (sub.status !== "ACTIVE") throw new Error("Only active plans can be cancelled (opt-out)");

  const principal = sub.amount;
  await investDb.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", maturityAction: "ADMIN_CANCEL", maturityActionAt: new Date() },
  });
  await purgeAgreementsForSubscription(sub.id, reason || "Plan cancelled by admin");

  await investDb.wallet.update({
    where: { investorId: sub.investorId },
    data: {
      invested: { decrement: principal },
      ...(refundPrincipal ? { available: { increment: principal } } : {}),
    },
  });

  if (refundPrincipal) {
    await addLedger(sub.investorId, {
      type: "REFUND",
      direction: "CREDIT",
      amount: principal,
      reference: sub.id,
      note: reason || `Admin cancelled ${sub.plan?.name || "plan"} — principal returned`,
    });
  }

  await notifyInvestor(
    sub.investorId,
    "Investment plan cancelled",
    `${sub.plan?.name || "Your plan"} was cancelled by admin.${refundPrincipal ? ` ${fmtInr(principal)} returned to your wallet.` : ""}`,
    { type: "INFO", link: "plans" }
  );

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "SUBSCRIPTION_ADMIN_CANCEL",
    entity: "Subscription",
    entityId: sub.id,
    meta: JSON.stringify({ refundPrincipal, principal }),
  });

  return sub;
}

export async function adminWalletOperation(body, actor) {
  const { investorId, amount, direction, bucket, note, sendNotice, transactionType } = body;
  const amt = Number(amount);
  if (!investorId || !Number.isFinite(amt) || amt <= 0) throw new Error("Invalid adjustment");

  const inv = await investDb.investor.findUnique({ where: { id: investorId } });
  if (!inv) throw new Error("Investor not found");

  if (sendNotice) {
    const dirLabel = direction === "DEBIT" ? "debit" : "credit";
    await sendPayoutNotice(inv, {
      title: `Wallet ${dirLabel} notice: ${fmtInr(amt)}`,
      body: `Your wallet will be ${dirLabel}ed by ${fmtInr(amt)} (${bucket || "available"}).`,
      amount: amt,
      kind: "ADJUSTMENT",
    });
  }

  const dir = direction === "DEBIT" ? "DEBIT" : "CREDIT";
  const target = bucket === "earnings" ? "earnings" : bucket === "invested" ? "invested" : "available";
  const wallet = await investDb.wallet.findUnique({ where: { investorId } });
  if (!wallet) throw new Error("Wallet not found");
  if (dir === "DEBIT" && wallet[target] < amt) throw new Error(`Insufficient ${target} balance`);

  await investDb.wallet.update({
    where: { investorId },
    data: { [target]: { increment: dir === "CREDIT" ? amt : -amt } },
  });

  if (target === "available" || target === "earnings") {
    const manualNote =
      note?.trim() ||
      `[Manual admin] ${dir === "CREDIT" ? "Credit" : "Debit"} ${target} — ${actor?.name || "Admin"}`;
    let ledgerType = "ADJUSTMENT";
    if (transactionType === "CASH_DEPOSIT" && dir === "CREDIT" && target === "available") ledgerType = "DEPOSIT";
    else if (transactionType === "CASH_WITHDRAWAL" && dir === "DEBIT" && target === "available") ledgerType = "WITHDRAWAL";
    else if (dir === "CREDIT" && target === "earnings") ledgerType = "RETURN";
    await addLedger(investorId, {
      type: ledgerType,
      direction: dir,
      amount: amt,
      note: manualNote.startsWith("[Manual") ? manualNote : `[Manual admin] ${manualNote}`,
    });
  }

  const audit = await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "WALLET_ADJUST",
    entity: "Wallet",
    entityId: investorId,
    meta: JSON.stringify({ amount: amt, direction: dir, bucket: target }),
  });

  if (transactionType === "CASH_DEPOSIT" && dir === "CREDIT" && target === "available") {
    const { creditPlatformCommissionOnDeposit } = await import("./platformCommission.js");
    await creditPlatformCommissionOnDeposit(investorId, amt, `wallet-adjust-${audit.id}`).catch(() => {});
  }

  return investDb.wallet.findUnique({ where: { investorId } });
}
