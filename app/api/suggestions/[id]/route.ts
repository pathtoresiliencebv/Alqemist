import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { executeQuery } from '@/lib/database';
import { proactiveSuggestionsEngine } from '@/lib/proactive-suggestions';

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
    const { action } = await req.json();

    switch (action) {
      case 'mark_shown':
        await executeQuery(`
          UPDATE proactive_suggestions 
          SET shown = true, interacted_at = NOW()
          WHERE id = $1 AND user_id = $2
        `, [id, userId]);
        
        await proactiveSuggestionsEngine.trackSuggestionInteraction(id, userId, 'viewed');
        break;

      case 'dismiss':
        await executeQuery(`
          UPDATE proactive_suggestions 
          SET dismissed = true, interacted_at = NOW()
          WHERE id = $1 AND user_id = $2
        `, [id, userId]);
        
        await proactiveSuggestionsEngine.dismissSuggestion(id, userId);
        await proactiveSuggestionsEngine.trackSuggestionInteraction(id, userId, 'dismissed');
        break;

      case 'interact':
        await executeQuery(`
          UPDATE proactive_suggestions 
          SET interacted_at = NOW()
          WHERE id = $1 AND user_id = $2
        `, [id, userId]);
        
        await proactiveSuggestionsEngine.trackSuggestionInteraction(id, userId, 'clicked');
        break;

      case 'complete':
        await executeQuery(`
          UPDATE proactive_suggestions 
          SET dismissed = true, interacted_at = NOW()
          WHERE id = $1 AND user_id = $2
        `, [id, userId]);
        
        await proactiveSuggestionsEngine.trackSuggestionInteraction(id, userId, 'completed');
        break;

      default:
        return new Response('Invalid action', { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
