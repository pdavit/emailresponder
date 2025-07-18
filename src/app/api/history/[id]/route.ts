import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE handler - deletes a single history item by id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Check if the record exists
    const existingRecord = await prisma.history.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'History record not found' },
        { status: 404 }
      );
    }

    // Delete the record
    await prisma.history.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'History record deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting history record:', error);
    return NextResponse.json(
      { error: 'Failed to delete history record' },
      { status: 500 }
    );
  }
} 