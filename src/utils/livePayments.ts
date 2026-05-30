import axios, { isAxiosError } from "axios";
import { API_PUBLIC_URL } from "@/constants/api";

export type LivePaymentPayload = {
  clerkId: string;
  callId: string;
  phoneNumber: string;
  type: "gift" | "donation";
  giftId?: string;
  amount: number;
  hostUserId?: string;
  senderName?: string;
};

export type LivePayInitResponse = {
  success: boolean;
  message?: string;
  checkoutRequestId?: string;
  mock?: boolean;
};

export type LivePayStatus = "pending" | "completed" | "failed" | "unknown";

export type LivePayResult =
  | {
      ok: true;
      mock?: boolean;
      pending?: boolean;
      message?: string;
      checkoutRequestId?: string;
    }
  | { ok: false; message: string };

/** Normalize Kenyan M-Pesa numbers to 2547XXXXXXXX */
export function normalizeMpesaPhone(phone: string): string {
  const raw = phone.trim().replace(/[\s-]/g, "");
  if (raw.startsWith("+254")) return raw.slice(1);
  if (raw.startsWith("0") && raw.length === 10) return `254${raw.slice(1)}`;
  if (raw.startsWith("254")) return raw;
  return raw;
}

export function isValidMpesaPhone(phone: string): boolean {
  const n = normalizeMpesaPhone(phone);
  return /^254[17]\d{8}$/.test(n);
}

function parsePayError(err: unknown): string {
  if (isAxiosError(err)) {
    if (err.response?.status === 404) {
      return "Live payments API is not available yet. Deploy the latest backend or set EXPO_PUBLIC_API_URL.";
    }
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (err.code === "ECONNABORTED") return "Payment request timed out. Check your connection.";
    if (!err.response) return "Could not reach the server. Check your internet connection.";
    return `Payment failed (${err.response.status})`;
  }
  if (err instanceof Error) return err.message;
  return "Payment failed. Please try again.";
}

export async function initiateLiveMpesaPayment(
  payload: LivePaymentPayload,
): Promise<LivePayInitResponse> {
  const res = await axios.post(
    `${API_PUBLIC_URL}/api/live/pay`,
    {
      ...payload,
      phoneNumber: normalizeMpesaPhone(payload.phoneNumber),
    },
    { timeout: 45_000 },
  );
  return res.data as LivePayInitResponse;
}

export async function fetchLivePaymentStatus(
  checkoutRequestId: string,
): Promise<{ status: LivePayStatus; amount?: number; type?: string; giftId?: string }> {
  const res = await axios.get(
    `${API_PUBLIC_URL}/api/live/pay/status/${encodeURIComponent(checkoutRequestId)}`,
    { timeout: 15_000 },
  );
  return res.data as {
    status: LivePayStatus;
    amount?: number;
    type?: string;
    giftId?: string;
  };
}

/** Poll until M-Pesa STK completes, fails, or times out (~60s). */
export async function pollLivePaymentStatus(
  checkoutRequestId: string,
  opts?: { maxAttempts?: number; intervalMs?: number },
): Promise<LivePayStatus> {
  const maxAttempts = opts?.maxAttempts ?? 20;
  const intervalMs = opts?.intervalMs ?? 3000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status } = await fetchLivePaymentStatus(checkoutRequestId);
      if (status === "completed" || status === "failed") return status;
    } catch {
      /* keep polling while STK may still be in flight */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return "pending";
}

/**
 * Full pay flow: initiate STK, poll when not mock, return whether gift/donation should broadcast.
 */
export async function completeLiveMpesaPayment(
  payload: LivePaymentPayload,
): Promise<LivePayResult> {
  try {
    const init = await initiateLiveMpesaPayment(payload);

    if (!init.success) {
      return { ok: false, message: init.message ?? "Payment could not be started." };
    }

    if (init.mock) {
      return {
        ok: true,
        mock: true,
        message: "Payment completed (test mode).",
        checkoutRequestId: init.checkoutRequestId,
      };
    }

    if (!init.checkoutRequestId) {
      return { ok: false, message: "Missing payment reference from server." };
    }

    const finalStatus = await pollLivePaymentStatus(init.checkoutRequestId);

    if (finalStatus === "completed") {
      return {
        ok: true,
        message: "M-Pesa payment received. Thank you!",
        checkoutRequestId: init.checkoutRequestId,
      };
    }

    if (finalStatus === "failed") {
      return {
        ok: false,
        message: "M-Pesa payment was declined or cancelled on your phone.",
      };
    }

    return {
      ok: false,
      message:
        "Payment still pending. Complete the M-Pesa prompt on your phone, then try again.",
    };
  } catch (err) {
    return { ok: false, message: parsePayError(err) };
  }
}
