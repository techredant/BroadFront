/**
 * Quick smoke test for live M-Pesa API (run against local backend).
 * Usage: node scripts/test-live-pay.mjs [baseUrl]
 * Example: node scripts/test-live-pay.mjs http://localhost:3000
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const payload = {
  clerkId: "test_clerk",
  callId: "test_call_123",
  phoneNumber: "0712345678",
  type: "donation",
  amount: 50,
  senderName: "Tester",
};

async function main() {
  console.log(`POST ${base}/api/live/pay`);
  const payRes = await fetch(`${base}/api/live/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const payJson = await payRes.json().catch(() => ({}));
  console.log("pay status:", payRes.status, payJson);

  if (!payJson.checkoutRequestId) {
    console.log("No checkoutRequestId — stop (deploy backend + MPESA_MOCK=true for local test).");
    process.exit(payRes.ok ? 0 : 1);
  }

  console.log(`GET ${base}/api/live/pay/status/${payJson.checkoutRequestId}`);
  const statusRes = await fetch(
    `${base}/api/live/pay/status/${encodeURIComponent(payJson.checkoutRequestId)}`,
  );
  const statusJson = await statusRes.json().catch(() => ({}));
  console.log("status:", statusRes.status, statusJson);
  process.exit(statusRes.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
