import { listNotInvestedInvestors, listKycPendingInvestors } from "../src/services/investorNurture.js";

try {
  const notInv = await listNotInvestedInvestors();
  const kyc = await listKycPendingInvestors();
  console.log(JSON.stringify({ notInvested: notInv.length, kycPending: kyc.length }));
} catch (e) {
  console.error("ERROR", e.message);
  process.exit(1);
}
