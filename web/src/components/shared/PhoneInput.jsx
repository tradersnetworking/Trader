import { useState } from "react";
import { COUNTRY_CODES } from "../../lib/country-codes.js";

/** Phone input with country code dropdown + manual override. */
export default function PhoneInput({
  countryCode = "+91",
  phone = "",
  onCountryCodeChange,
  onPhoneChange,
  required = false,
  className = "",
  placeholder = "9876543210",
}) {
  const [customCode, setCustomCode] = useState(() =>
    COUNTRY_CODES.some((c) => c.code === countryCode) ? "" : countryCode
  );
  const inList = COUNTRY_CODES.some((c) => c.code === countryCode) && !customCode;

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        className="input w-36 shrink-0 text-sm"
        value={inList ? countryCode : "__custom__"}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setCustomCode(countryCode || "+91");
            return;
          }
          setCustomCode("");
          onCountryCodeChange?.(e.target.value);
        }}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
        <option value="__custom__">Custom code…</option>
      </select>
      {!inList && (
        <input
          className="input w-20 shrink-0 font-mono text-sm"
          value={customCode}
          onChange={(e) => {
            setCustomCode(e.target.value);
            onCountryCodeChange?.(e.target.value);
          }}
          placeholder="+XX"
        />
      )}
      <input
        className="input min-w-0 flex-1 font-mono"
        type="tel"
        required={required}
        value={phone}
        onChange={(e) => onPhoneChange?.(e.target.value.replace(/[^\d\s-]/g, ""))}
        placeholder={placeholder}
      />
    </div>
  );
}
