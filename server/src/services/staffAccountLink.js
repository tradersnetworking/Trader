import { mainDb, investDb } from "../db.js";
import { hashPassword } from "../utils/auth.js";
import { issueAuthToken, reissueAuthToken } from "./authSession.js";
import { publicInvestor } from "../utils/investorUser.js";

const INVEST_STAFF_ROLES = ["ADMIN", "SUPERADMIN"];
const MAIN_STAFF_ROLES = ["ADMIN", "SUPERADMIN"];

export function isInvestStaffRole(role) {
  return INVEST_STAFF_ROLES.includes(role);
}

export function isMainStaffRole(role) {
  return MAIN_STAFF_ROLES.includes(role);
}

function publicMainUser(u) {
  if (!u) return null;
  const { passwordHash, resetToken, resetExpires, sessionId, ...rest } = u;
  return rest;
}

export async function findLinkedMainUser(investor) {
  if (!investor?.email || !isInvestStaffRole(investor.role)) return null;
  const user = await mainDb.user.findUnique({ where: { email: investor.email.toLowerCase() } });
  if (!user || !isMainStaffRole(user.role) || !user.isActive) return null;
  return user;
}

export async function findLinkedInvestor(user) {
  if (!user?.email || !isMainStaffRole(user.role)) return null;
  const investor = await investDb.investor.findUnique({ where: { email: user.email.toLowerCase() } });
  if (!investor || !isInvestStaffRole(investor.role) || !investor.isActive) return null;
  return investor;
}

/** Sync password hash to linked admin/super-admin on the other portal (same email). */
export async function syncStaffPasswordHash(email, passwordHash) {
  const e = (email || "").toLowerCase();
  const [user, investor] = await Promise.all([
    mainDb.user.findUnique({ where: { email: e } }),
    investDb.investor.findUnique({ where: { email: e } }),
  ]);
  const ops = [];
  if (user && isMainStaffRole(user.role)) {
    ops.push(mainDb.user.update({ where: { id: user.id }, data: { passwordHash } }));
  }
  if (investor && isInvestStaffRole(investor.role)) {
    ops.push(investDb.investor.update({ where: { id: investor.id }, data: { passwordHash } }));
  }
  if (ops.length) await Promise.all(ops);
}

export async function syncStaffPassword(email, plainPassword) {
  await syncStaffPasswordHash(email, hashPassword(plainPassword));
}

/**
 * Change email on both portals for linked staff. Caller must verify password on current record.
 * Returns updated sibling records for token reissue.
 */
export async function syncStaffEmailChange({ fromScope, accountId, newEmail }) {
  const normalized = String(newEmail).toLowerCase().trim();
  if (fromScope === "invest") {
    const investor = await investDb.investor.findUnique({ where: { id: accountId } });
    if (!investor || !isInvestStaffRole(investor.role)) {
      return { investor: null, user: null };
    }
    const clashInvest = await investDb.investor.findUnique({ where: { email: normalized } });
    if (clashInvest && clashInvest.id !== investor.id) {
      throw Object.assign(new Error("Email already in use"), { status: 409 });
    }
    const clashMain = await mainDb.user.findUnique({ where: { email: normalized } });
    const linked = await findLinkedMainUser(investor);
    if (clashMain && (!linked || clashMain.id !== linked.id)) {
      throw Object.assign(new Error("Email already in use"), { status: 409 });
    }
    const updatedInvestor = await investDb.investor.update({
      where: { id: investor.id },
      data: { email: normalized },
    });
    let updatedUser = null;
    if (linked) {
      updatedUser = await mainDb.user.update({ where: { id: linked.id }, data: { email: normalized } });
    }
    return { investor: updatedInvestor, user: updatedUser };
  }

  const user = await mainDb.user.findUnique({ where: { id: accountId } });
  if (!user || !isMainStaffRole(user.role)) {
    return { investor: null, user: null };
  }
  const clashMain = await mainDb.user.findUnique({ where: { email: normalized } });
  if (clashMain && clashMain.id !== user.id) {
    throw Object.assign(new Error("Email already in use"), { status: 409 });
  }
  const linked = await findLinkedInvestor(user);
  const clashInvest = await investDb.investor.findUnique({ where: { email: normalized } });
  if (clashInvest && (!linked || clashInvest.id !== linked.id)) {
    throw Object.assign(new Error("Email already in use"), { status: 409 });
  }
  const updatedUser = await mainDb.user.update({ where: { id: user.id }, data: { email: normalized } });
  let updatedInvestor = null;
  if (linked) {
    updatedInvestor = await investDb.investor.update({ where: { id: linked.id }, data: { email: normalized } });
  }
  return { investor: updatedInvestor, user: updatedUser };
}

/** Issue JWT + public user for the sibling staff portal (invest ↔ main). */
export async function issueSiblingStaffAuth(fromScope, account, req) {
  if (fromScope === "invest") {
    const mainUser = await findLinkedMainUser(account);
    if (!mainUser) return {};
    const mainToken = await issueAuthToken(
      "main",
      { id: mainUser.id, role: mainUser.role, email: mainUser.email },
      { req }
    );
    return { mainToken, mainUser: publicMainUser(mainUser) };
  }
  const investor = await findLinkedInvestor(account);
  if (!investor) return {};
  const investToken = await issueAuthToken(
    "invest",
    { id: investor.id, role: investor.role, email: investor.email },
    { req }
  );
  return { investToken, investUser: publicInvestor(investor) };
}

/** Reissue tokens for both portals after email change (staff only). */
export async function reissueStaffEmailTokens({ investor, user }, sidByScope) {
  const out = {};
  if (investor) {
    out.investToken = await reissueAuthToken(
      "invest",
      { id: investor.id, role: investor.role, email: investor.email },
      sidByScope?.invest
    );
    out.investUser = publicInvestor(investor);
  }
  if (user) {
    out.mainToken = await reissueAuthToken(
      "main",
      { id: user.id, role: user.role, email: user.email },
      sidByScope?.main
    );
    out.mainUser = publicMainUser(user);
  }
  return out;
}

export async function appendStaffSiblingToLogin(fromScope, account, body, req) {
  if (fromScope === "invest" && !isInvestStaffRole(account.role)) return body;
  if (fromScope === "main" && !isMainStaffRole(account.role)) return body;
  const sibling = await issueSiblingStaffAuth(fromScope, account, req);
  return { ...body, ...sibling };
}
