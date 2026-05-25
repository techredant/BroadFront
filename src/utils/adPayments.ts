import axios, { isAxiosError } from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import {
  isValidMpesaPhone,
  normalizeMpesaPhone,
} from "@/utils/livePayments";

export type AdPayStatus = "pending" | "completed" | "failed" | "unknown";

export type AdPayResult =
  | {
      ok: true;
      activated?: boolean;
      mock?: boolean;
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

export async function initiateCampaignMpesaPayment(
  campaignId: string,
  body: { clerkId: string; phoneNumber: string },
) {
  const res = await axios.post(
    `${API_PUBLIC_URL}/api/advertiser/campaigns/${campaignId}/pay`,
    {
      clerkId: body.clerkId,
      method: "mpesa",
      phoneNumber: normalizeMpesaPhone(body.phoneNumber),
    },
    { timeout: 45_000, validateStatus: (s) => s < 500 },
  );

  const data = res.data as {
    success?: boolean;
    message?: string;
    activated?: boolean;
    checkoutRequestId?: string;
    mock?: boolean;
  };

  if (res.status >= 400 || data.success === false) {
    throw new Error(data.message || "Payment could not be started.");
  }

  return data;
}

export async function fetchCampaignPaymentStatus(
  campaignId: string,
  checkoutRequestId: string,
): Promise<{ status: AdPayStatus; amount?: number }> {
  const res = await axios.get(
    `${API_PUBLIC_URL}/api/advertiser/campaigns/${campaignId}/pay/status/${encodeURIComponent(checkoutRequestId)}`,
    { timeout: 15_000 },
  );
  return res.data as { status: AdPayStatus; amount?: number };
}

export async function pollCampaignPaymentStatus(
  campaignId: string,
  checkoutRequestId: string,
  opts?: { maxAttempts?: number; intervalMs?: number; initialDelayMs?: number },
): Promise<AdPayStatus> {
  const maxAttempts = opts?.maxAttempts ?? 40;
  const intervalMs = opts?.intervalMs ?? 3000;
  const initialDelayMs = opts?.initialDelayMs ?? 5000;

  await new Promise((r) => setTimeout(r, initialDelayMs));

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { status } = await fetchCampaignPaymentStatus(
        campaignId,
        checkoutRequestId,
      );
      if (status === "completed" || status === "failed") return status;
    } catch {
      /* STK may still be in flight */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return "pending";
}

/**
 * Pay for an ad campaign via M-Pesa and poll until confirmed, failed, or timeout.
 */
export async function completeCampaignMpesaPayment(
  campaignId: string,
  body: { clerkId: string; phoneNumber: string },
): Promise<AdPayResult> {
  if (!isValidMpesaPhone(body.phoneNumber)) {
    return {
      ok: false,
      message:
        "Enter a valid Safaricom number (07XX or +2547...). Sandbox test line: 254708374149.",
    };
  }

  try {
    const init = await initiateCampaignMpesaPayment(campaignId, body);

    if (init.activated) {
      return {
        ok: true,
        activated: true,
        mock: init.mock,
        checkoutRequestId: init.checkoutRequestId,
        message:
          init.message ??
          "Payment received. Your ad is pending admin approval.",
      };
    }

    if (!init.checkoutRequestId) {
      return { ok: false, message: "Missing payment reference from server." };
    }

    const finalStatus = await pollCampaignPaymentStatus(
      campaignId,
      init.checkoutRequestId,
    );

    if (finalStatus === "completed") {
      return {
        ok: true,
        activated: true,
        checkoutRequestId: init.checkoutRequestId,
        message:
          "M-Pesa payment received. Your ad is pending admin approval.",
      };
    }

    if (finalStatus === "failed") {
      return {
        ok: false,
        message:
          "M-Pesa payment was declined or cancelled. Try again, or use sandbox number 254708374149 and wait ~20 seconds.",
      };
    }

    return {
      ok: false,
      message:
        "Payment still pending. Sandbox: wait ~20 seconds (no PIN on your phone is normal) — the server auto-confirms test payments. Deploy the latest API to Vercel first.",
    };
  } catch (err) {
    return { ok: false, message: parsePayError(err) };
  }
}

export { isValidMpesaPhone, normalizeMpesaPhone };
