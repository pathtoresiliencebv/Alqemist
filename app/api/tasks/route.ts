import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { taskScheduler } from '@/lib/task-scheduler';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'upcoming';
    const days = parseInt(url.searchParams.get('days') || '7');

    let tasks;
    switch (type) {
      case 'pending':
        tasks = await taskScheduler.getPendingTasks(userId);
        break;
      case 'upcoming':
        tasks = await taskScheduler.getUpcomingTasks(userId, days);
        break;
      case 'suggestions':
        tasks = await taskScheduler.generateSmartSuggestions(userId);
        break;
      default:
        tasks = await taskScheduler.getUpcomingTasks(userId, days);
    }

    return Response.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const taskData = await req.json();
    
    const taskId = await taskScheduler.scheduleTask({
      ...taskData,
      userId,
      scheduledFor: new Date(taskData.scheduledFor),
    });

    return Response.json({ id: taskId, success: true });
  } catch (error) {
    console.error('Error creating task:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
