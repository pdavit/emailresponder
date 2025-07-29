// scripts/patchCustomerId.ts

import { prisma } from "@/lib/prisma";

async function main() {
  const email = "pdavit1220@gmail.com";
  const stripeCustomerId = "cus_SlVbl89WHoEsQs";

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { stripeCustomerId },
  });

  console.log("✅ Patched user:", updatedUser);
}

main()
  .catch((e) => {
    console.error("❌ Failed to patch user:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
