import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET handler - returns all History records sorted by createdAt DESC
export async function GET() {
  try {
    const history = await prisma.history.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

// DELETE handler - deletes all records in the History table
export async function DELETE() {
  try {
    await prisma.history.deleteMany();
    
    return NextResponse.json(
      { message: 'All history records deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting history:', error);
    return NextResponse.json(
      { error: 'Failed to delete history' },
      { status: 500 }
    );
  }
} 