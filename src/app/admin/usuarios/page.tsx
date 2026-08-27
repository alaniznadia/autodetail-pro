import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UsersPanel } from "@/components/admin/users-panel";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "EMPLOYEE"] } },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <UsersPanel
      users={users.map((u) => ({
        ...u,
        role: u.role as "ADMIN" | "EMPLOYEE",
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session!.user.id}
    />
  );
}
