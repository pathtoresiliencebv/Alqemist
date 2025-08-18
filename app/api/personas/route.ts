import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { personaManager } from '@/lib/custom-personas';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'templates':
        const templates = personaManager.getPersonaTemplates();
        return Response.json(templates);
      
      case 'active':
        const activePersona = await personaManager.getActivePersona(userId);
        return Response.json(activePersona);
      
      default:
        const personas = await personaManager.getUserPersonas(userId);
        return Response.json(personas);
    }
  } catch (error) {
    console.error('Error fetching personas:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { action, templateId, personaData } = body;

    let personaId: string;

    if (action === 'from-template' && templateId) {
      personaId = await personaManager.createPersonaFromTemplate(userId, templateId, personaData);
    } else {
      personaId = await personaManager.createPersona(userId, personaData);
    }

    return Response.json({ id: personaId, success: true });
  } catch (error) {
    console.error('Error creating persona:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
