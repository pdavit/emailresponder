import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // or wherever your prisma is

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  try {
    const existingRecord = await prisma.history.findUnique({
      where: { id: parsedId },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: 'History record not found' }, { status: 404 });
    }

    await prisma.history.delete({ where: { id: parsedId } });

    return NextResponse.json({ message: 'History record deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting history record:', error);
    return NextResponse.json({ error: 'Failed to delete history record' }, { status: 500 });
  }
}
