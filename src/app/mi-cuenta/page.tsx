import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import { SignOutButton } from "@/components/store/sign-out-button";
import { getStoreSettings } from "@/lib/store-settings";
import { getBalance } from "@/lib/loyalty";
import { LoyaltyBalanceCard } from "@/components/store/loyalty-ui";
import { ProductCard, type CatalogProduct } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const session = await auth();
  // proxy.ts ya protege /mi-cuenta, esto es solo defensa en profundidad.
  if (!session?.user) redirect("/login");

  const [orders, settings, balance, favorites] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    getStoreSettings(),
    getBalance(session.user.id),
    prisma.favorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            variants: { where: { active: true }, take: 1, include: { stockItems: true } },
            images: { take: 1 },
            reviews: { where: { approved: true }, select: { rating: true } },
          },
        },
      },
    }),
  ]);

  const favoriteProducts: CatalogProduct[] = favorites
    .filter((f) => f.product.active)
    .map((f) => {
      const product = f.product;
      const variant = product.variants[0];
      const image = product.images[0];
      const stock = variant?.stockItems.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
      const reviewCount = product.reviews.length;
      const rating =
        reviewCount > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : null;
      return {
        id: product.id,
        slug: product.slug,
        sku: variant?.sku ?? "",
        name: product.name,
        variantId: variant?.id ?? "",
        variantName: variant?.name ?? "",
        variantLabel: variant && variant.name !== "Único" ? variant.name : null,
        price: variant?.price.toString() ?? "0",
        stock,
        imageUrl: image?.url ?? null,
        rating,
        reviewCount,
        favorited: true,
      };
    });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Mi cuenta</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {session.user.name} — {session.user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      {(session.user.role === "ADMIN" || session.user.role === "EMPLOYEE") && (
        <div className="mt-6 flex flex-wrap gap-3">
          {session.user.role === "ADMIN" && (
            <Link
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
            >
              Ir al panel de administración
            </Link>
          )}
          <Link
            href="/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-border px-4 py-2 font-display text-sm hover:border-accent"
          >
            Ir al punto de venta
          </Link>
        </div>
      )}

      {settings.loyaltyEnabled && (
        <div className="mt-6 max-w-sm">
          <LoyaltyBalanceCard
            balance={balance}
            nextRewardAt={settings.loyaltyMinRedeem}
            pointValue={Number(settings.loyaltyPointValue)}
          />
        </div>
      )}

      {favoriteProducts.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg">Mis favoritos</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} loggedIn />
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 font-display text-lg">Mis pedidos</h2>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/70">
          Todavía no hiciste ningún pedido.{" "}
          <Link href="/catalogo" className="underline underline-offset-4">
            Ver catálogo
          </Link>
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded border border-border">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-4 p-4 text-sm">
              <div>
                <Link
                  href={`/pedido/${order.id}`}
                  className="font-display underline underline-offset-4"
                >
                  Pedido #{order.orderNumber}
                </Link>
                <p className="mt-1 text-foreground/60">
                  {new Date(order.createdAt).toLocaleDateString("es-AR")} —{" "}
                  {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                </p>
              </div>
              <div className="text-right">
                <p>{ORDER_STATUS_LABEL[order.status] ?? order.status}</p>
                <p className="font-display">${order.total.toString()}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
