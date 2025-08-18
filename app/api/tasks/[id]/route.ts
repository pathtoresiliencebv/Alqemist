import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { taskScheduler } from '@/lib/task-scheduler';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const { action, snoozeMinutes } = await req.json();

    switch (action) {
      case 'complete':
        await taskScheduler.completeTask(id, userId);
        break;
      case 'snooze':
        await taskScheduler.snoozeTask(id, userId, snoozeMinutes || 60);
        break;
      case 'cancel':
        await taskScheduler.cancelTask(id, userId);
        break;
      default:
        return new Response('Invalid action', { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
