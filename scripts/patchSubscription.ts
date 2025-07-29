import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema"; // adjust if schema path is different

const emailArg = process.argv.find(arg => arg.startsWith('--email='));
const subscriptionIdArg = process.argv.find(arg => arg.startsWith('--subscriptionId='));
const statusArg = process.argv.find(arg => arg.startsWith('--status='));

const email = emailArg?.split('=')[1];
const subscriptionId = subscriptionIdArg?.split('=')[1];
const status = statusArg?.split('=')[1];

if (!email || !subscriptionId || !status) {
  console.error('❌ Missing arguments. Usage example:');
  console.error('npx tsx scripts/patchSubscription.ts --email=user@example.com --subscriptionId=sub_xxxx --status=trialing');
  process.exit(1);
}

console.log('📧 Looking up user with email:', email);

async function main() {
  const user = await db.select().from(users).where(eq(users.email, email)).then(res => res[0]);

  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionId,
      subscriptionStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`✅ Subscription updated for ${email}:`);
  console.log({ subscriptionId, status });
}

main().catch(err => {
  console.error('❌ Failed to patch subscription:', err);
});
