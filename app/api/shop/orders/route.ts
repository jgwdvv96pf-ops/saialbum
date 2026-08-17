import { NextRequest, NextResponse } from "next/server";
import { addOrder, getOrders, setDiscordMessageId } from "@/lib/orders";
import { getProducts } from "@/lib/shop";
import { isAuthed } from "@/lib/auth";
import { postOrderMessage } from "@/lib/discord";
import { sendOrderConfirmationEmail } from "@/lib/shop/order-email";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await getOrders();
  return NextResponse.json({ orders });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deliberately public — anyone can place an order (this just records
// intent to buy; you confirm and arrange payment over DM yourself).
export async function POST(req: NextRequest) {
  const { items, buyerName, email, contact, note } = await req.json();

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    !buyerName ||
    !contact
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Re-price and re-validate server-side against the live product
  // manifest — never trust prices/availability sent from the client.
  const products = await getProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  const orderItems = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: `Item no longer available` },
        { status: 400 }
      );
    }
    if (product.sold) {
      return NextResponse.json(
        { error: `"${product.title}" was just sold — sorry!` },
        { status: 409 }
      );
    }
    orderItems.push({
      productId: product.id,
      title: product.title,
      price: product.price,
      qty: 1, // one-of-a-kind items — quantity is always 1
    });
  }

  const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const order = await addOrder({
    items: orderItems,
    total,
    buyerName: String(buyerName).slice(0, 120),
    email: String(email).trim().slice(0, 200),
    contact: String(contact).slice(0, 120),
    note: note ? String(note).slice(0, 500) : undefined,
  });

  const messageId = await postOrderMessage(order);
  if (messageId) {
    await setDiscordMessageId(order.id, messageId);
  }

  await sendOrderConfirmationEmail(order);

  return NextResponse.json({ ok: true, order });
}
