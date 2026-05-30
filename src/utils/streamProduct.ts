import type { Attachment, LocalMessage } from "stream-chat";

type ProductPayload = {
  id?: string;
  title?: string;
  price?: number;
};

type MessageWithProduct = LocalMessage & {
  productId?: string;
  product?: ProductPayload;
};

export function resolveProductId(
  message?: LocalMessage | null,
  attachment?: Attachment | null,
): string | undefined {
  const att = attachment as Attachment & { productId?: string };
  if (att?.productId) return String(att.productId);

  const msg = message as MessageWithProduct | undefined;
  if (msg?.productId) return String(msg.productId);
  if (msg?.product?.id) return String(msg.product.id);

  const custom = msg?.custom as { productId?: string } | undefined;
  if (custom?.productId) return String(custom.productId);

  for (const item of msg?.attachments ?? []) {
    const id = (item as Attachment & { productId?: string }).productId;
    if (id) return String(id);
  }

  return undefined;
}

export function resolveProductMeta(
  message?: LocalMessage | null,
  attachment?: Attachment | null,
) {
  const att = attachment as Attachment & {
    productId?: string;
    title?: string;
    price?: number;
  };
  const msg = message as MessageWithProduct | undefined;

  return {
    productId: resolveProductId(message, attachment),
    title: att?.title ?? msg?.product?.title,
    price: att?.price ?? msg?.product?.price,
  };
}
