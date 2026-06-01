import { useState } from "react";

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button type="button" onClick={copy} className="btn-outline shrink-0 px-2 py-1 text-[10px] sm:text-xs">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CredentialRow({ label, value, mono = true }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 border-b border-border/60 py-2 last:border-0 sm:items-center">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-start justify-end gap-1.5 sm:items-center">
        <span className={`max-w-full break-all text-right text-sm font-medium ${mono ? "font-mono text-xs sm:text-sm" : ""}`}>
          {value}
        </span>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

export function CompanyBankDetails({ bank, account, compact = false, showUpi = true, transferType }) {
  if (account) {
    return (
      <div className={`surface-panel min-w-0 overflow-hidden ${compact ? "p-4" : "p-5"}`}>
        <h3 className="text-heading mb-1 text-base font-bold">{account.name || "Company Bank Account"}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Transfer via {transferType || "IMPS/NEFT/RTGS"}. Include your registered name in the payment reference.
        </p>
        <div className="rounded-xl border border-border bg-muted/30 p-3 dark:bg-muted/20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-tone">Bank Account (INR)</p>
          <CredentialRow label="Account Holder" value={account.accountHolder} mono={false} />
          <CredentialRow label="Bank" value={account.bankName} mono={false} />
          <CredentialRow label="Account No." value={account.accountNumber} />
          <CredentialRow label="IFSC" value={account.ifsc} />
          {account.branchName && <CredentialRow label="Branch" value={account.branchName} mono={false} />}
        </div>
      </div>
    );
  }

  if (!bank) return null;
  const b = bank.bank || bank;
  const upi = bank.upi;

  return (
    <div className={`surface-panel min-w-0 overflow-hidden ${compact ? "p-4" : "p-5"}`}>
      <h3 className="text-heading mb-1 text-base font-bold">Company Account Details</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Transfer only to the account below. Include your registered name in the payment reference.
      </p>

      {showUpi && upi?.vpa && (
        <div className="panel-sky mb-3 rounded-xl p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-info-tone">UPI</p>
          <CredentialRow label="UPI ID" value={upi.vpa} />
          {upi.payeeName && <CredentialRow label="Payee Name" value={upi.payeeName} mono={false} />}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-3 dark:bg-muted/20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-tone">Bank Account</p>
        <CredentialRow label="Account Holder" value={b.accountName} mono={false} />
        <CredentialRow label="Bank" value={b.name} mono={false} />
        <CredentialRow label="Account No." value={b.accountNumber} />
        <CredentialRow label="IFSC" value={b.ifsc} />
        {b.branch && <CredentialRow label="Branch" value={b.branch} mono={false} />}
        {b.micr && <CredentialRow label="MICR" value={b.micr} />}
        {b.swift && <CredentialRow label="SWIFT" value={b.swift} />}
      </div>
    </div>
  );
}
