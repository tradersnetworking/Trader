/** Client-side check that KYC was fully submitted (not a partial draft in review). */

export function isKycFullySubmitted(kyc) {
  if (!kyc?.status || kyc.status === "NOT_SUBMITTED") return false;
  if (kyc.status === "APPROVED" || kyc.status === "REJECTED") return true;

  const hasAadhaar = (kyc.aadhaarFront && kyc.aadhaarBack) || kyc.aadhaarDocument;
  const bankProof =
    kyc.cancelledCheque || kyc.passbookDocument || kyc.bankStatementDocument;
  const hasSig = kyc.signature || kyc.signatureData;
  const idType = String(kyc.idType || "").toUpperCase();
  const primaryIdOk =
    idType === "PAN"
      ? Boolean(kyc.panNumber?.trim() && kyc.panDocument)
      : idType === "AADHAAR"
        ? Boolean(kyc.aadhaarNumber?.trim() && hasAadhaar)
        : idType === "DRIVERS_LICENSE"
          ? Boolean(kyc.idNumber?.trim() && kyc.driversLicenseDocument)
          : idType === "PASSPORT"
            ? Boolean(kyc.idNumber?.trim() && kyc.passportDocument)
            : false;

  return Boolean(
    kyc.fullName?.trim() &&
      kyc.panNumber &&
      kyc.aadhaarNumber &&
      kyc.photo &&
      kyc.selfie &&
      kyc.panDocument &&
      hasAadhaar &&
      kyc.addressProof &&
      primaryIdOk &&
      kyc.bankName &&
      kyc.bankAccount &&
      kyc.ifscCode &&
      bankProof &&
      hasSig
  );
}
