import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { investDb } from "../db.js";
import { config } from "../config.js";

const challenges = new Map();

function rpConfig() {
  const origin = config.investOrigin || "http://localhost:5173";
  const host = new URL(origin).hostname;
  return { rpName: "Akshaya Invest", rpID: host === "localhost" ? "localhost" : host.replace(/^invest\./, ""), origin };
}

export async function getRegistrationOptions(investor) {
  const { rpName, rpID } = rpConfig();
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

export async function verifyRegistration(investor, body, deviceName) {
  const { rpID, origin } = rpConfig();
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
  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  await investDb.webAuthnCredential.create({
    data: {
      investorId: investor.id,
      credentialId: Buffer.from(credentialID).toString("base64url"),
      publicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
      deviceName: deviceName || "Passkey",
    },
  });
  return { ok: true };
}

export async function getAuthenticationOptions(investor) {
  const { rpID } = rpConfig();
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

export async function getLoginAuthenticationOptions(email, challengePrefix = "auth:login") {
  const investor = await investDb.investor.findUnique({
    where: { email: (email || "").toLowerCase() },
  });
  if (!investor || !investor.isActive) throw new Error("Passkey login not available for this account");
  const { rpID } = rpConfig();
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

export async function verifyLoginAuthentication(email, body, challengePrefix = "auth:login") {
  const investor = await investDb.investor.findUnique({
    where: { email: (email || "").toLowerCase() },
    include: { kyc: { select: { photo: true, selfie: true } } },
  });
  if (!investor || !investor.isActive) throw new Error("Passkey login failed");
  const { rpID, origin } = rpConfig();
  const expectedChallenge = challenges.get(`${challengePrefix}:${investor.id}`);
  if (!expectedChallenge) throw new Error("Authentication challenge expired");
  const credId = body.id || body.rawId;
  const cred = await investDb.webAuthnCredential.findFirst({
    where: { investorId: investor.id, credentialId: credId },
  });
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

export async function verifyAuthentication(investor, body) {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = challenges.get(`auth:${investor.id}`);
  if (!expectedChallenge) throw new Error("Authentication challenge expired");
  const cred = await investDb.webAuthnCredential.findUnique({ where: { credentialId: body.id } });
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
