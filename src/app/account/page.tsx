import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const me = await db.query.users.findFirst({ where: eq(users.id, userId) });

  return (
    <main className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="rounded-2xl border p-6 space-y-3">
        <div className="text-gray-600">
          <p>Email: <b>{me?.email}</b></p>
          <p>Member since: <b>{me?.createdAt?.toLocaleDateString()}</b></p>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> Payment functionality is temporarily unavailable and will be re-integrated with Stripe in a future update.
          </p>
        </div>
      </div>
    </main>
  );
}
