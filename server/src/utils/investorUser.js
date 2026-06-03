/** Strip secrets and attach KYC profile photo for API responses */
export function publicInvestor(u) {
  if (!u) return null;
  const { passwordHash, resetToken, resetExpires, totpSecret, backupCodes, kyc, googleId, ...rest } = u;
  const kycStatus = kyc?.status || "NOT_SUBMITTED";
  const fromKyc = kyc && kycStatus !== "NOT_SUBMITTED" ? kyc : null;
  return {
    ...rest,
    googleLinked: Boolean(googleId),
    name: fromKyc?.fullName?.trim() || rest.name,
    phone: fromKyc?.phone || rest.phone,
    phoneCountryCode: fromKyc?.phoneCountryCode || rest.phoneCountryCode,
    upiId: fromKyc?.upiId || rest.upiId,
    bankName: fromKyc?.bankName || rest.bankName,
    accountNumber: fromKyc?.bankAccount || rest.accountNumber,
    ifsc: fromKyc?.ifscCode || rest.ifsc,
    profilePicture: kyc?.photo || kyc?.selfie || null,
    kycStatus,
    kycApproved: kycStatus === "APPROVED",
  };
}
