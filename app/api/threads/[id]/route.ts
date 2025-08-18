import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await params;

    // Verify thread belongs to user before deleting
    const threadCheck = await executeQuery(
      'SELECT id FROM threads WHERE id = $1 AND user_id = $2',
      [threadId, userId]
    );

    if (threadCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Thread not found or unauthorized' }, { status: 404 });
    }

    // Delete thread and associated messages (CASCADE should handle this)
    await executeQuery(
      'DELETE FROM threads WHERE id = $1 AND user_id = $2',
      [threadId, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: threadId } = await params;

    // Get thread with messages
    const threadResult = await executeQuery(
      'SELECT * FROM threads WHERE id = $1 AND user_id = $2',
      [threadId, userId]
    );

    if (threadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const messagesResult = await executeQuery(
      'SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC',
      [threadId]
    );

    return NextResponse.json({
      thread: threadResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
