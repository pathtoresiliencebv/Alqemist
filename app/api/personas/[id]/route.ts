import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { personaManager } from '@/lib/custom-personas';

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
    const body = await req.json();
    const { action, ...updates } = body;

    switch (action) {
      case 'activate':
        await personaManager.activatePersona(userId, id);
        break;
      case 'set-default':
        await personaManager.setDefaultPersona(userId, id);
        break;
      default:
        await personaManager.updatePersona(id, userId, updates);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating persona:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    await personaManager.deletePersona(id, userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
