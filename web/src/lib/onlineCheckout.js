function postRedirectForm(action, fields) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [k, v] of Object.entries(fields || {})) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v ?? "";
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

function loadScript(src, globalKey) {
  return new Promise((resolve, reject) => {
    if (globalKey && window[globalKey]) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

async function openCashfreeCheckout(payment) {
  await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js", "Cashfree");
  const mode = payment.cashfreeMode === "production" ? "production" : "sandbox";
  const cashfree = window.Cashfree({ mode });
  await cashfree.checkout({
    paymentSessionId: payment.paymentSessionId,
    redirectTarget: "_self",
  });
}

/** Redirect to gateway checkout after deposit order is created. */
export async function handleGatewayCheckout(payment, deposit) {
  if (!payment) return false;

  const phonePeUrl =
    payment?.data?.instrumentResponse?.redirectInfo?.url ||
    payment?.redirectUrl;
  if (phonePeUrl) {
    window.location.href = phonePeUrl;
    return true;
  }

  if (payment?.approveUrl) {
    sessionStorage.setItem("paypal_deposit_id", deposit?.id || "");
    sessionStorage.setItem("paypal_access_token", payment.accessToken || "");
    window.location.href = payment.approveUrl;
    return true;
  }

  if (payment?.checkout?.simulate || payment?.mock) return false;

  if (payment?.redirectUrl && !payment?.mock) {
    window.location.href = payment.redirectUrl;
    return true;
  }

  if (payment?.virtualAccount) {
    sessionStorage.setItem("bank_deposit_va", JSON.stringify(payment.virtualAccount));
    return false;
  }

  if (payment?.formFields && payment?.action) {
    postRedirectForm(payment.action, payment.formFields);
    return true;
  }

  if (payment?.paymentSessionId) {
    try {
      await openCashfreeCheckout(payment);
      return true;
    } catch {
      return false;
    }
  }

  if (payment?.keyId && payment?.orderId && window.Razorpay) {
    const rzp = new window.Razorpay({
      key: payment.keyId,
      amount: Math.round(Number(deposit?.amount || payment.amount) * 100),
      currency: payment.currency || "INR",
      order_id: payment.orderId,
      name: "Akshaya Invest",
      description: "Wallet deposit",
    });
    rzp.open();
    return true;
  }

  return false;
}

/** After PayPal redirect back — capture payment if return params present. */
export async function capturePayPalReturnIfNeeded(investApi) {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return;
  const accessToken = sessionStorage.getItem("paypal_access_token");
  if (!accessToken) return;
  try {
    await fetch("/api/invest/webhooks/paypal/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("aex_invest_token") || ""}` },
      body: JSON.stringify({ orderId: token, accessToken }),
    });
    sessionStorage.removeItem("paypal_access_token");
    sessionStorage.removeItem("paypal_deposit_id");
  } catch {}
}
