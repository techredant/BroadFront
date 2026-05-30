import axios, { isAxiosError } from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import {
  isValidMpesaPhone,
  normalizeMpesaPhone,
} from "@/utils/livePayments";

export type BoostPayStatus =
  | "pending_payment"
  | "active"
  | "expired"
  | "cancelled"
  | "unknown";

export type BoostPayResult =
  | {
      ok: true;
      activated?: boolean;
      mock?: boolean;
      expiresAt?: string;
      checkoutRequestId?: string;
      message?: string;
    }
  | { ok: false; message: string };

function parsePayError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (!err.response) return "Could not reach the server. Check your connection.";
    return `Payment failed (${err.response.status})`;
  }
  if (err instanceof Error) return err.message;
  return "Payment failed. Please try again.";
}

export async function initiateBoostPayment(body: {
  productId: string;
  userId: string;
  planId: string;
  phoneNumber: string;
}) {
  const res = await axios.post(
    `${API_PUBLIC_URL}/api/marketplace/boost/pay`,
    {
      ...body,
      phoneNumber: normalizeMpesaPhone(body.phoneNumber),
    },
    { timeout: 45_000, validateStatus: (s) => s < 500 },
  );

  const data = res.data as {
    success?: boolean;
    message?: string;
    activated?: boolean;
    checkoutRequestId?: string;
    expiresAt?: string;
    mock?: boolean;
  };

  if (res.status >= 400 || data.success === false) {
    throw new Error(data.message || "Payment could not be started.");
  }

  return data;
}

export async function fetchBoostPaymentStatus(checkoutRequestId: string): Promise<{
  status: BoostPayStatus;
  expiresAt?: string;
}> {
  const res = await axios.get(
    `${API_PUBLIC_URL}/api/marketplace/boost/pay/status/${encodeURIComponent(checkoutRequestId)}`,
    { timeout: 15_000 },
  );
  return res.data as { status: BoostPayStatus; expiresAt?: string };
}

export async function pollBoostPaymentStatus(
  checkoutRequestId: string,
  opts?: { maxAttempts?: number; intervalMs?: number; initialDelayMs?: number },
): Promise<BoostPayStatus> {
  const maxAttempts = opts?.maxAttempts ?? 40;
  const intervalMs = opts?.intervalMs ?? 3000;
  const initialDelayMs = opts?.initialDelayMs ?? 5000;

  await new Promise((r) => setTimeout(r, initialDelayMs));

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status } = await fetchBoostPaymentStatus(checkoutRequestId);
      if (status === "active" || status === "cancelled") return status;
    } catch {
      /* STK may still be in flight */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return "pending_payment";
}

export async function completeBoostPayment(body: {
  productId: string;
  userId: string;
  planId: string;
  phoneNumber: string;
}): Promise<BoostPayResult> {
  if (!isValidMpesaPhone(body.phoneNumber)) {
    return {
      ok: false,
      message:
        "Enter a valid Safaricom number (07XX or +2547...). Sandbox test: 254708374149.",
    };
  }

  try {
    const init = await initiateBoostPayment(body);

    if (init.activated) {
      return {
        ok: true,
        activated: true,
        mock: init.mock,
        expiresAt: init.expiresAt,
        checkoutRequestId: init.checkoutRequestId,
        message: init.message ?? "Your listing is now promoted.",
      };
    }

    if (!init.checkoutRequestId) {
      return { ok: false, message: "Missing payment reference from server." };
    }

    const finalStatus = await pollBoostPaymentStatus(init.checkoutRequestId);

    if (finalStatus === "active") {
      let expiresAt: string | undefined;
      try {
        const status = await fetchBoostPaymentStatus(init.checkoutRequestId);
        expiresAt = status.expiresAt;
      } catch {
        /* optional */
      }
      return {
        ok: true,
        activated: true,
        expiresAt,
        checkoutRequestId: init.checkoutRequestId,
        message: "M-Pesa payment received. Your listing is now promoted!",
      };
    }

    if (finalStatus === "cancelled") {
      return {
        ok: false,
        message:
          "M-Pesa payment was declined or cancelled. On sandbox, enter PIN 174379 when prompted (phone 254708374149).",
      };
    }

    return {
      ok: false,
      message:
        "Payment still pending. Open the M-Pesa prompt on your phone, enter PIN 174379 (sandbox), then try Boost again.",
    };
  } catch (err) {
    return { ok: false, message: parsePayError(err) };
  }
}

export { isValidMpesaPhone, normalizeMpesaPhone };
