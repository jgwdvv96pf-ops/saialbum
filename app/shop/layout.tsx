import { isAuthed } from "@/lib/auth";
import { CartProvider } from "@/components/shop/CartContext";
import CartBadge from "@/components/shop/CartBadge";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthed();

  return (
    <CartProvider>
      <main className="mx-auto max-w-[1400px] px-6 py-10 sm:px-10 sm:py-14">
        <header className="mb-10 flex items-baseline justify-between border-b border-line pb-6 sm:mb-14">
          <a href="/shop" className="font-display text-3xl italic tracking-tight sm:text-4xl">
            shop
          </a>
          <div className="flex items-baseline gap-4">
            <a
              href="/"
              className="font-mono text-xs text-fog transition hover:text-ink"
            >
              photos
            </a>
            {authed && (
              <>
                <a
                  href="/shop/upload"
                  className="font-mono text-xs text-fog transition hover:text-ink"
                >
                  add item
                </a>
                <a
                  href="/shop/admin"
                  className="font-mono text-xs text-fog transition hover:text-ink"
                >
                  orders
                </a>
              </>
            )}
            <CartBadge />
          </div>
        </header>
        {children}
      </main>
    </CartProvider>
  );
}
