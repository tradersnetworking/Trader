import { investDb } from "../db.js";
import { hashPassword } from "../utils/auth.js";
import { maturityDate } from "../utils/invest.js";
import { addLedger } from "../routes/investInvestor.js";
import { notifyInvestor } from "./notifications.js";
import { sendMail } from "../utils/mailer.js";
import { creditReferralOnInvestment } from "./referral.js";
import { generateSubscriptionAgreement } from "./agreements.js";
import { logAudit } from "./auditLog.js";

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
        verifiedAt: k.status === "REJECTED" ? null : new Date(),
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
        ...(k.status != null && { status: k.status, verifiedAt: k.status === "APPROVED" ? new Date() : null }),
      },
    });
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
  const { planId, amount, settlementCycle, customMonthlyRoiPct, roiOverrideNote, skipBalanceCheck } = body;
  const plan = await investDb.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new Error("Plan not available");

  const amt = Number(amount);
  if (!amt || amt < plan.minInvestment || amt > plan.maxInvestment) {
    throw new Error(`Amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`);
  }

  const wallet = await investDb.wallet.findUnique({ where: { investorId } });
  if (!wallet) throw new Error("Wallet not found");

  if (skipBalanceCheck && wallet.available < amt) {
    const topUp = amt - wallet.available;
    await investDb.wallet.update({ where: { investorId }, data: { available: { increment: topUp } } });
    await addLedger(investorId, { type: "DEPOSIT", direction: "CREDIT", amount: topUp, note: "Admin funded for plan assignment" });
  } else if (!skipBalanceCheck && wallet.available < amt) {
    throw new Error("Insufficient available balance. Credit wallet first or enable skip balance check.");
  }

  const monthlyRoi = customMonthlyRoiPct != null ? Number(customMonthlyRoiPct) : plan.monthlyRoiPct;
  const start = new Date();

  const sub = await investDb.subscription.create({
    data: {
      investorId,
      planId: plan.id,
      amount: amt,
      settlementCycle: settlementCycle || plan.settlementCycle || "MONTHLY",
      monthlyRoiPct: monthlyRoi,
      roiOverrideNote: customMonthlyRoiPct != null ? (roiOverrideNote || "Admin custom ROI") : null,
      lockInDays: plan.lockInDays,
      startDate: start,
      maturityDate: maturityDate(start, plan.lockInDays),
      status: "ACTIVE",
    },
  });

  await addLedger(investorId, { type: "INVESTMENT", direction: "DEBIT", amount: amt, reference: sub.id, note: `Admin assigned: ${plan.name}` });
  await investDb.wallet.update({
    where: { investorId },
    data: { available: { decrement: amt }, invested: { increment: amt } },
  });

  await creditReferralOnInvestment(investorId, amt, sub.id).catch(() => {});

  try {
    await generateSubscriptionAgreement(investorId, sub.id, { ipAddress: "admin", userAgent: "admin-panel" });
  } catch {
    /* non-fatal */
  }

  await notifyInvestor(investorId, "Investment assigned", `An investment of ${fmtInr(amt)} in ${plan.name} was set up on your account.`, { type: "SUCCESS", link: "investments" });

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

export async function updateSubscriptionRoi(subscriptionId, { monthlyRoiPct, roiOverrideNote }, actor) {
  const sub = await investDb.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true, investor: true } });
  if (!sub) throw new Error("Subscription not found");
  const pct = Number(monthlyRoiPct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Error("Invalid ROI percentage");

  const updated = await investDb.subscription.update({
    where: { id: subscriptionId },
    data: { monthlyRoiPct: pct, roiOverrideNote: roiOverrideNote || `Admin adjusted from ${sub.plan?.monthlyRoiPct}%` },
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

export async function adminWalletOperation(body, actor) {
  const { investorId, amount, direction, bucket, note, sendNotice } = body;
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
    await addLedger(investorId, {
      type: dir === "CREDIT" && target === "earnings" ? "RETURN" : "ADJUSTMENT",
      direction: dir,
      amount: amt,
      note: note || `Admin ${dir.toLowerCase()} — ${target}`,
    });
  }

  await logAudit({
    actorId: actor?.id,
    actorRole: actor?.role,
    actorName: actor?.name,
    action: "WALLET_ADJUST",
    entity: "Wallet",
    entityId: investorId,
    meta: JSON.stringify({ amount: amt, direction: dir, bucket: target }),
  });

  return investDb.wallet.findUnique({ where: { investorId } });
}
