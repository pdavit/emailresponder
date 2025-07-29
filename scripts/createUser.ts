import { prisma } from '@/lib/db';

async function main() {
  const email = 'pdavit1220@gmail.com';

  const newUser = await prisma.user.create({
    data: {
      email,
      // add any other fields required by your schema, like name or image if needed
    },
  });

  console.log('✅ User created:', newUser);
}

main().catch((err) => {
  console.error('❌ Failed to create user:', err);
  process.exit(1);
});
