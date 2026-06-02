import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { investDb } from "../db.js";
import { config } from "../config.js";

const challenges = new Map();

/** Derive WebAuthn RP ID and origin from the browser request (fixes .com / .in and proxy mismatches). */
export function resolveRpFromRequest(req) {
  const fallback = (config.investOrigin || "http://localhost:5173").replace(/\/$/, "");
  let origin = String(req?.headers?.origin || "").trim();
  if (!origin) {
    const proto = req?.headers?.["x-forwarded-proto"];
    const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
    if (proto && host) origin = `${proto}://${host}`;
  }
  if (!origin) origin = fallback;
  const url = new URL(origin);
  const hostname = url.hostname.toLowerCase();
  let rpID = hostname;
  if (hostname === "127.0.0.1" || hostname === "localhost") {
    rpID = "localhost";
  } else if (hostname.startsWith("invest.")) {
    // Parent registrable domain — matches passkeys registered on invest.* hosts
    rpID = hostname.slice("invest.".length);
  }
  return { rpName: "AKSHYA INVESTMENTS", rpID, origin: url.origin };
}

function rpConfig(req) {
  return req ? resolveRpFromRequest(req) : resolveRpFromRequest(null);
}

function credentialIdToString(id) {
  if (!id) return "";
  if (typeof id === "string") return id;
  return Buffer.from(id).toString("base64url");
}

function registrationCredentialFields(registrationInfo) {
  const cred = registrationInfo?.credential;
  if (cred) {
    return {
      credentialId: credentialIdToString(cred.id),
      publicKey: Buffer.from(cred.publicKey).toString("base64"),
      counter: cred.counter ?? 0,
    };
  }
  const { credentialID, credentialPublicKey, counter } = registrationInfo;
  return {
    credentialId: Buffer.from(credentialID).toString("base64url"),
    publicKey: Buffer.from(credentialPublicKey).toString("base64"),
    counter: counter ?? 0,
  };
}

async function findCredentialForAssertion(investorId, body) {
  const responseId = credentialIdToString(body.id || body.rawId);
  if (responseId) {
    const exact = await investDb.webAuthnCredential.findFirst({
      where: { investorId, credentialId: responseId },
    });
    if (exact) return exact;
  }
  const creds = await investDb.webAuthnCredential.findMany({ where: { investorId } });
  if (!responseId) return creds[0] || null;
  return creds.find((c) => c.credentialId === responseId) || null;
}

export async function getRegistrationOptions(investor, req) {
  const { rpName, rpID } = rpConfig(req);
  const existing = await investDb.webAuthnCredential.findMany({ where: { investorId: investor.id } });
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: investor.email,
    userDisplayName: investor.name,
    userID: Buffer.from(investor.id),
    excludeCredentials: existing.map((c) => ({ id: c.credentialId, type: "public-key" })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  challenges.set(investor.id, options.challenge);
  return options;
}

export async function verifyRegistration(investor, body, deviceName, req) {
  const { rpID, origin } = rpConfig(req);
  const expectedChallenge = challenges.get(investor.id);
  if (!expectedChallenge) throw new Error("Registration challenge expired");
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  challenges.delete(investor.id);
  if (!verification.verified || !verification.registrationInfo) throw new Error("Registration failed");
  const { credentialId, publicKey, counter } = registrationCredentialFields(verification.registrationInfo);
  await investDb.webAuthnCredential.create({
    data: {
      investorId: investor.id,
      credentialId,
      publicKey,
      counter,
      deviceName: deviceName || "Passkey",
    },
  });
  return { ok: true };
}

export async function getAuthenticationOptions(investor, req) {
  const { rpID } = rpConfig(req);
  const creds = await investDb.webAuthnCredential.findMany({ where: { investorId: investor.id } });
  if (!creds.length) throw new Error("No passkeys registered");
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({ id: c.credentialId, type: "public-key" })),
    userVerification: "preferred",
  });
  challenges.set(`auth:${investor.id}`, options.challenge);
  return options;
}

export async function getLoginAuthenticationOptions(email, challengePrefix = "auth:login", req) {
  const investor = await investDb.investor.findUnique({
    where: { email: (email || "").toLowerCase() },
  });
  if (!investor || !investor.isActive) throw new Error("Passkey login not available for this account");
  const { rpID } = rpConfig(req);
  const creds = await investDb.webAuthnCredential.findMany({ where: { investorId: investor.id } });
  if (!creds.length) throw new Error("No passkeys registered for this account");
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({ id: c.credentialId, type: "public-key" })),
    userVerification: "preferred",
  });
  challenges.set(`${challengePrefix}:${investor.id}`, options.challenge);
  return { options, investorId: investor.id };
}

export async function verifyLoginAuthentication(email, body, challengePrefix = "auth:login", req) {
  const investor = await investDb.investor.findUnique({
    where: { email: (email || "").toLowerCase() },
    include: { kyc: { select: { photo: true, selfie: true } } },
  });
  if (!investor || !investor.isActive) throw new Error("Passkey login failed");
  const { rpID, origin } = rpConfig(req);
  const expectedChallenge = challenges.get(`${challengePrefix}:${investor.id}`);
  if (!expectedChallenge) throw new Error("Authentication challenge expired — try again");
  const cred = await findCredentialForAssertion(investor.id, body);
  if (!cred) throw new Error("Unknown credential");
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(cred.credentialId, "base64url"),
      credentialPublicKey: Buffer.from(cred.publicKey, "base64"),
      counter: cred.counter,
    },
  });
  challenges.delete(`${challengePrefix}:${investor.id}`);
  if (!verification.verified) throw new Error("Passkey verification failed");
  await investDb.webAuthnCredential.update({
    where: { id: cred.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });
  return investor;
}

export function isWebAuthnSupported() {
  return true;
}

export async function verifyAuthentication(investor, body, req) {
  const { rpID, origin } = rpConfig(req);
  const expectedChallenge = challenges.get(`auth:${investor.id}`);
  if (!expectedChallenge) throw new Error("Authentication challenge expired");
  const cred = await findCredentialForAssertion(investor.id, body);
  if (!cred || cred.investorId !== investor.id) throw new Error("Unknown credential");
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: Buffer.from(cred.credentialId, "base64url"),
      credentialPublicKey: Buffer.from(cred.publicKey, "base64"),
      counter: cred.counter,
    },
  });
  challenges.delete(`auth:${investor.id}`);
  if (!verification.verified) throw new Error("Authentication failed");
  await investDb.webAuthnCredential.update({
    where: { id: cred.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });
  return { ok: true };
}

export async function listPasskeys(investorId) {
  return investDb.webAuthnCredential.findMany({
    where: { investorId },
    select: { id: true, deviceName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deletePasskey(investorId, id) {
  await investDb.webAuthnCredential.deleteMany({ where: { id, investorId } });
}
