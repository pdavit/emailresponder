// scripts/listUsers.ts

import { prisma } from "@/lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("👥 Users in DB:", users);
}

main()
  .catch((e) => {
    console.error("❌ Failed to list users:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
