import axios, { isAxiosError } from "axios";
import { API_PUBLIC_URL } from "@/constants/api";
import {
  isValidMpesaPhone,
  normalizeMpesaPhone,
} from "@/utils/livePayments";

export type LiveStreamKind = "community" | "market";

export type HostAccessPlan = {
  id: LiveStreamKind;
  label: string;
  amount: number;
  currency: string;
  description: string;
};

export type HostAccessPayResult =
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

export async function fetchHostAccessPlans(): Promise<HostAccessPlan[]> {
  const res = await axios.get(`${API_PUBLIC_URL}/api/live/host-access/plans`);
  return (res.data?.plans ?? []) as HostAccessPlan[];
}

export async function verifyHostAccessPaid(
  clerkId: string,
  callId: string,
): Promise<boolean> {
  try {
    const res = await axios.get(`${API_PUBLIC_URL}/api/live/host-access/verify`, {
      params: { clerkId, callId },
    });
    return Boolean(res.data?.paid);
  } catch {
    return false;
  }
}

async function initiateHostAccessPayment(body: {
  clerkId: string;
  callId: string;
  streamKind: LiveStreamKind;
  phoneNumber: string;
  roomTitle?: string;
  productId?: string;
}) {
  const res = await axios.post(
    `${API_PUBLIC_URL}/api/live/host-access/pay`,
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
    mock?: boolean;
  };

  if (res.status >= 400 || data.success === false) {
    throw new Error(data.message || "Payment could not be started.");
  }

  return data;
}

async function fetchHostAccessPaymentStatus(checkoutRequestId: string) {
  const res = await axios.get(
    `${API_PUBLIC_URL}/api/live/host-access/pay/status/${encodeURIComponent(checkoutRequestId)}`,
    { timeout: 15_000 },
  );
  return res.data as { status: string };
}

async function pollHostAccessPayment(
  checkoutRequestId: string,
): Promise<"completed" | "failed" | "pending"> {
  await new Promise((r) => setTimeout(r, 5000));
  for (let i = 0; i < 40; i++) {
    try {
      const { status } = await fetchHostAccessPaymentStatus(checkoutRequestId);
      if (status === "completed" || status === "failed") {
        return status as "completed" | "failed";
      }
    } catch {
      /* still processing */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return "pending";
}

export async function completeHostAccessPayment(body: {
  clerkId: string;
  callId: string;
  streamKind: LiveStreamKind;
  phoneNumber: string;
  roomTitle?: string;
  productId?: string;
}): Promise<HostAccessPayResult> {
  if (!isValidMpesaPhone(body.phoneNumber)) {
    return {
      ok: false,
      message:
        "Enter a valid Safaricom number (07XX or +2547...). Sandbox: 254708374149.",
    };
  }

  try {
    const already = await verifyHostAccessPaid(body.clerkId, body.callId);
    if (already) {
      return { ok: true, activated: true, message: "Host access already active." };
    }

    const init = await initiateHostAccessPayment(body);

    if (init.activated) {
      return {
        ok: true,
        activated: true,
        mock: init.mock,
        checkoutRequestId: init.checkoutRequestId,
        message: init.message ?? "You can go live now.",
      };
    }

    if (!init.checkoutRequestId) {
      return { ok: false, message: "Missing payment reference from server." };
    }

    const finalStatus = await pollHostAccessPayment(init.checkoutRequestId);

    if (finalStatus === "completed") {
      return {
        ok: true,
        activated: true,
        checkoutRequestId: init.checkoutRequestId,
        message: "Payment received. Starting your livestream…",
      };
    }

    if (finalStatus === "failed") {
      return {
        ok: false,
        message:
          "M-Pesa payment failed or was cancelled. Sandbox: wait ~20s or use 254708374149.",
      };
    }

    return {
      ok: false,
      message:
        "Payment still pending. Sandbox: wait ~20 seconds (no PIN on your phone is normal).",
    };
  } catch (err) {
    return { ok: false, message: parsePayError(err) };
  }
}

export { isValidMpesaPhone, normalizeMpesaPhone };
