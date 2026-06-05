import fs from "fs";
import path from "path";
import { investDb } from "../db.js";
import { uploadsDir, fileUrl } from "../utils/upload.js";
import { isAllowedKycUploadField } from "../constants/kycUploadFields.js";
import {
  logKycUpload,
  sha256File,
  validateKycUploadBasics,
  validateKycFileMagic,
  scanUploadedFile,
} from "./kycUploadSecurity.js";
import { validateMulterFile, validateUploadedDocument, KYC_DOC_LABELS } from "../utils/documentQuality.js";
import { KYC_UPLOAD_FIELD_KEYS } from "../constants/kycUploadFields.js";

export async function listStagedKycUploads(investorId) {
  const rows = await investDb.kycDocumentUpload.findMany({
    where: { investorId, status: { in: ["STAGED", "REJECTED", "FAILED"] } },
    orderBy: { updatedAt: "desc" },
  });
  const map = {};
  for (const r of rows) {
    if (!map[r.fieldKey] || r.status === "STAGED") map[r.fieldKey] = formatUploadRow(r);
  }
  return map;
}

function mergeKycRecordUploads(kyc, uploadsMap) {
  if (!kyc) return uploadsMap;
  const out = { ...uploadsMap };
  for (const fieldKey of KYC_UPLOAD_FIELD_KEYS) {
    const url = kyc[fieldKey];
    if (!url || out[fieldKey]?.status === "STAGED") continue;
    if (!out[fieldKey] || out[fieldKey].status === "FAILED") {
      out[fieldKey] = {
        fieldKey,
        url,
        status: "STAGED",
        label: KYC_DOC_LABELS[fieldKey] || fieldKey,
        failReason: null,
      };
    }
  }
  return out;
}

function formatUploadRow(r) {
  return {
    id: r.id,
    fieldKey: r.fieldKey,
    url: r.publicUrl,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    status: r.status,
    failReason: r.failReason,
    sha256: r.sha256,
    updatedAt: r.updatedAt,
    label: KYC_DOC_LABELS[r.fieldKey] || r.fieldKey,
  };
}

export async function getKycDraft(investorId) {
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  const uploads = mergeKycRecordUploads(kyc, await listStagedKycUploads(investorId));
  let form = null;
  if (kyc?.draftFormJson) {
    try {
      form = JSON.parse(kyc.draftFormJson);
    } catch {
      form = null;
    }
  }
  const step = typeof kyc?.draftStep === "number" ? kyc.draftStep : 0;
  const uploadedFields = [...KYC_UPLOAD_FIELD_KEYS].filter((key) => {
    const u = uploads[key];
    return u?.url && u.status !== "FAILED";
  });
  const hasProgress =
    Boolean(form) ||
    uploadedFields.length > 0 ||
    kyc?.uploadStatus === "IN_PROGRESS";
  return {
    step,
    form,
    uploadStatus: kyc?.uploadStatus || "NOT_STARTED",
    uploads,
    kycStatus: kyc?.status || "NOT_SUBMITTED",
    resumed: hasProgress && step >= 0,
    savedAt: kyc?.updatedAt || null,
    uploadSummary: {
      completed: uploadedFields.length,
      total: KYC_UPLOAD_FIELD_KEYS.size,
      fields: uploadedFields,
    },
  };
}

export async function saveKycDraft(investorId, { step, form }) {
  const data = {
    draftStep: Number.isFinite(step) ? step : 0,
    draftFormJson: form ? JSON.stringify(form) : null,
    uploadStatus: "IN_PROGRESS",
  };
  const existing = await investDb.kyc.findUnique({ where: { investorId } });
  if (existing) {
    await investDb.kyc.update({ where: { investorId }, data });
  } else {
    await investDb.kyc.create({
      data: { investorId, status: "NOT_SUBMITTED", ...data },
    });
  }
  return getKycDraft(investorId);
}

export async function stageKycFileUpload(investorId, fieldKey, file) {
  if (!isAllowedKycUploadField(fieldKey)) {
    return { ok: false, status: 400, error: "Invalid document field.", code: "INVALID_FIELD" };
  }

  const basics = validateKycUploadBasics(file);
  if (!basics.ok) {
    logKycUpload("warn", "Upload rejected (basics)", { investorId, fieldKey, code: basics.code });
    await recordFailedUpload(investorId, fieldKey, basics.message);
    return { ok: false, status: 400, error: basics.message, code: basics.code };
  }

  const magic = validateKycFileMagic(file.path, basics.ext);
  if (!magic.ok) {
    safeUnlink(file.path);
    logKycUpload("warn", "Upload rejected (magic)", { investorId, fieldKey, code: magic.code });
    await recordFailedUpload(investorId, fieldKey, magic.message);
    return { ok: false, status: 400, error: magic.message, code: magic.code };
  }

  const quality = await validateMulterFile(file, KYC_DOC_LABELS[fieldKey] || fieldKey, { strict: false });
  if (!quality.ok) {
    safeUnlink(file.path);
    await recordFailedUpload(investorId, fieldKey, quality.message);
    return { ok: false, status: 400, error: quality.message, code: quality.code };
  }

  const scan = await scanUploadedFile(file.path);
  if (!scan.ok) {
    safeUnlink(file.path);
    await recordFailedUpload(investorId, fieldKey, scan.message || "Security scan failed.");
    return { ok: false, status: 400, error: scan.message || "File failed security scan.", code: "SCAN_FAILED" };
  }

  const sha256 = sha256File(file.path);
  const dup = await investDb.kycDocumentUpload.findFirst({
    where: { investorId, sha256, fieldKey: { not: fieldKey }, status: "STAGED" },
  });
  if (dup) {
    safeUnlink(file.path);
    return {
      ok: false,
      status: 400,
      error: `This file was already uploaded as ${KYC_DOC_LABELS[dup.fieldKey] || dup.fieldKey}.`,
      code: "DUPLICATE_FILE",
    };
  }

  const prev = await investDb.kycDocumentUpload.findUnique({
    where: { investorId_fieldKey: { investorId, fieldKey } },
  });
  if (prev?.storedName) safeUnlink(path.join(uploadsDir, prev.storedName));

  const publicUrl = fileUrl(file.filename);
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  const row = await investDb.kycDocumentUpload.upsert({
    where: { investorId_fieldKey: { investorId, fieldKey } },
    create: {
      investorId,
      kycId: kyc?.id || null,
      fieldKey,
      storedName: file.filename,
      publicUrl,
      mimeType: magic.mime,
      sizeBytes: basics.size,
      sha256,
      status: "STAGED",
      failReason: null,
      attemptCount: 1,
      scannedAt: new Date(),
      scanResult: scan.result,
    },
    update: {
      storedName: file.filename,
      publicUrl,
      mimeType: magic.mime,
      sizeBytes: basics.size,
      sha256,
      status: "STAGED",
      failReason: null,
      attemptCount: { increment: 1 },
      scannedAt: new Date(),
      scanResult: scan.result,
    },
  });

  const draftPatch = { uploadStatus: "IN_PROGRESS", [fieldKey]: publicUrl };
  if (kyc) {
    await investDb.kyc.update({
      where: { investorId },
      data: draftPatch,
    });
  } else {
    await investDb.kyc.create({
      data: { investorId, status: "NOT_SUBMITTED", draftStep: 1, ...draftPatch },
    });
  }

  logKycUpload("info", "File staged", { investorId, fieldKey, size: basics.size });
  return { ok: true, upload: formatUploadRow(row) };
}

async function recordFailedUpload(investorId, fieldKey, reason) {
  try {
    const existing = await investDb.kycDocumentUpload.findUnique({
      where: { investorId_fieldKey: { investorId, fieldKey } },
    });
    if (existing) {
      await investDb.kycDocumentUpload.update({
        where: { id: existing.id },
        data: { status: "FAILED", failReason: reason, attemptCount: { increment: 1 } },
      });
    }
  } catch (e) {
    logKycUpload("error", "Failed to record upload failure", { investorId, fieldKey, err: e.message });
  }
}

export async function deleteStagedKycUpload(investorId, fieldKey) {
  if (!isAllowedKycUploadField(fieldKey)) return { ok: false, status: 400, error: "Invalid field." };
  const row = await investDb.kycDocumentUpload.findUnique({
    where: { investorId_fieldKey: { investorId, fieldKey } },
  });
  if (row?.storedName) safeUnlink(path.join(uploadsDir, row.storedName));
  await investDb.kycDocumentUpload.deleteMany({ where: { investorId, fieldKey } });
  const kyc = await investDb.kyc.findUnique({ where: { investorId } });
  if (kyc?.[fieldKey]) {
    await investDb.kyc.update({
      where: { investorId },
      data: { [fieldKey]: null, uploadStatus: "IN_PROGRESS" },
    });
  }
  return { ok: true };
}

/** Merge staged uploads into KYC payload; mark rows ATTACHED after submit. */
export async function applyStagedUploadsToKycData(investorId, data, files = {}) {
  const staged = await investDb.kycDocumentUpload.findMany({
    where: { investorId, status: "STAGED" },
  });
  for (const row of staged) {
    if (!files[row.fieldKey]?.[0]) data[row.fieldKey] = row.publicUrl;
  }
  return staged;
}

/** Strict quality check on all staged files before final KYC submit. */
export async function validateStagedKycFilesStrict(investorId) {
  const staged = await investDb.kycDocumentUpload.findMany({
    where: { investorId, status: "STAGED" },
  });
  for (const row of staged) {
    if (!row.storedName) continue;
    const filePath = path.join(uploadsDir, row.storedName);
    const label = KYC_DOC_LABELS[row.fieldKey] || row.fieldKey;
    const check = await validateUploadedDocument(filePath, { label, strict: true });
    if (!check.ok) return { ok: false, error: check.message, code: check.code, fieldKey: row.fieldKey };
  }
  return { ok: true };
}

export async function markStagedUploadsAttached(investorId) {
  await investDb.kycDocumentUpload.updateMany({
    where: { investorId, status: "STAGED" },
    data: { status: "ATTACHED" },
  });
  await investDb.kyc.updateMany({
    where: { investorId },
    data: { uploadStatus: "READY", draftStep: null, draftFormJson: null },
  });
}

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}
