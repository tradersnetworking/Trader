import {
  isValidPan,
  isValidAadhaar,
  validateKycFile,
  KYC_DOCUMENT_FIELDS,
} from "./kyc-document-fields.js";
import { validateSignatureBase64 } from "./signatureQuality.js";
import { guardianFieldLabel } from "./kycForm.js";
import { canEditSection } from "./kyc-sections.js";

/**
 * Returns whether investor KYC can be submitted and a list of human-readable blockers.
 */
export function kycSubmitReadiness({
  kyc,
  form,
  files = {},
  signatureData,
  signatureFile,
  confirmed = false,
}) {
  const blockers = [];
  const hasDoc = (key) => Boolean(files[key] || kyc?.[key]);

  const checkStep = (s) => {
    if (s === 0) {
      if (kyc && !canEditSection(kyc, "personal")) return;
      if (!form.fullName?.trim()) blockers.push("Full name is required");
      if (!form.guardianName?.trim()) blockers.push(`${guardianFieldLabel(form.guardianType)} is required`);
      if (!form.dob) blockers.push("Date of birth is required");
      if (!form.phone?.trim()) blockers.push("Mobile number is required");
      const wa = form.sameWhatsapp ? form.phone : form.whatsappNumber;
      if (!String(wa || "").trim()) blockers.push("WhatsApp number is required");
      if (!form.houseNo?.trim()) blockers.push("House / flat number is required");
      if (!form.area?.trim() && !form.street?.trim()) blockers.push("Street or area is required");
      if (!form.district?.trim()) blockers.push("District is required");
      if (!form.state?.trim()) blockers.push("State is required");
      if (!/^\d{6}$/.test(String(form.pincode || "").trim())) blockers.push("Valid 6-digit PIN code is required");
      return;
    }

    if (s === 1) {
      const editIdentity = !kyc || canEditSection(kyc, "identity");
      const editSignature = !kyc || canEditSection(kyc, "signature");
      if (!editIdentity && !editSignature) return;

      if (editIdentity) {
        if (!isValidPan(form.panNumber)) blockers.push("Valid PAN number is required");
        if (!isValidAadhaar(form.aadhaarNumber)) blockers.push("Valid 12-digit Aadhaar is required");
        if (!hasDoc("photo")) blockers.push("Passport-size photo upload is required");
        if (!hasDoc("panDocument")) blockers.push("PAN card document upload is required");
        const aadhaarOk = (hasDoc("aadhaarFront") && hasDoc("aadhaarBack")) || hasDoc("aadhaarDocument");
        if (!aadhaarOk) blockers.push("Aadhaar front & back (or single Aadhaar file) upload is required");
        if (!hasDoc("selfie")) blockers.push("Selfie verification photo is required");
        if (!hasDoc("addressProof")) blockers.push("Address proof upload is required");
        if (form.idType === "PASSPORT") {
          if (!String(form.idNumber || "").trim()) blockers.push("Passport number is required");
          if (!hasDoc("passportDocument")) blockers.push("Passport document upload is required");
        }
        if (form.idType === "DRIVERS_LICENSE") {
          if (!String(form.idNumber || "").trim()) blockers.push("Driving licence number is required");
          if (!hasDoc("driversLicenseDocument")) blockers.push("Driving licence document upload is required");
        }
      }

      if (editSignature) {
        const hasSig = signatureData || signatureFile || kyc?.signature || kyc?.signatureData;
        if (!hasSig) blockers.push("Signature is required (draw or upload)");
        else if (signatureData) {
          const sigErr = validateSignatureBase64(signatureData);
          if (sigErr) blockers.push(sigErr);
        }
      }

      for (const [key, file] of Object.entries(files)) {
        const def = KYC_DOCUMENT_FIELDS.find((d) => d.key === key);
        const fileErr = validateKycFile(file, { imageOnly: def?.imageOnly });
        if (fileErr) blockers.push(`${def?.label || key}: ${fileErr}`);
      }
      return;
    }

    if (s === 2) {
      if (kyc && !canEditSection(kyc, "banking")) return;
      if (!form.bankName?.trim()) blockers.push("Bank name is required");
      if (!form.bankAccount?.trim()) blockers.push("Account number is required");
      if (!form.ifscCode?.trim()) blockers.push("IFSC code is required");
      const bp =
        form.bankProofType === "CHEQUE"
          ? hasDoc("cancelledCheque")
          : form.bankProofType === "PASSBOOK"
            ? hasDoc("passbookDocument")
            : hasDoc("bankStatementDocument");
      if (!bp) {
        blockers.push(
          form.bankProofType === "STATEMENT"
            ? "Bank statement upload is required"
            : form.bankProofType === "PASSBOOK"
              ? "Bank passbook upload is required"
              : "Cancelled cheque upload is required"
        );
      }
    }
  };

  for (let i = 0; i < 3; i++) checkStep(i);
  if (!confirmed) blockers.push("Confirm the declaration on the review step");

  const unique = [...new Set(blockers)];
  return { ready: unique.length === 0, blockers: unique };
}
