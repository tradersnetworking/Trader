/** Strip secrets and attach KYC profile photo for API responses */
export function publicInvestor(u) {
  if (!u) return null;
  const { passwordHash, resetToken, resetExpires, totpSecret, backupCodes, kyc, ...rest } = u;
  return {
    ...rest,
    profilePicture: kyc?.photo || kyc?.selfie || null,
  };
}
