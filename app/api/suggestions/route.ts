import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { executeQuery } from '@/lib/database';
import { proactiveSuggestionsEngine } from '@/lib/proactive-suggestions';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const includeShown = url.searchParams.get('include_shown') === 'true';

    let whereClause = 'user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())';
    if (!includeShown) {
      whereClause += ' AND shown = false AND dismissed = false';
    }

    const result = await executeQuery(`
      SELECT * FROM proactive_suggestions 
      WHERE ${whereClause}
      ORDER BY 
        CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
        confidence DESC,
        created_at DESC
      LIMIT $2
    `, [userId, limit]);

    const suggestions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      confidence: parseFloat(row.confidence),
      priority: row.priority,
      metadata: JSON.parse(row.metadata),
      actions: JSON.parse(row.actions),
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      shown: row.shown,
      dismissed: row.dismissed
    }));

    return Response.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { action } = await req.json();

    if (action === 'generate') {
      // Generate new suggestions
      const suggestions = await proactiveSuggestionsEngine.generateSuggestions(userId);
      
      // Store them in database
      for (const suggestion of suggestions) {
        await executeQuery(`
          INSERT INTO proactive_suggestions (
            id, user_id, type, title, description, confidence, priority,
            metadata, actions, created_at, expires_at, shown, dismissed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          suggestion.id,
          userId,
          suggestion.type,
          suggestion.title,
          suggestion.description,
          suggestion.confidence,
          suggestion.priority,
          JSON.stringify(suggestion.metadata),
          JSON.stringify(suggestion.actions),
          suggestion.createdAt,
          suggestion.expiresAt || null,
          false,
          false
        ]);
      }

      return Response.json({ 
        success: true, 
        generated: suggestions.length,
        suggestions: suggestions.slice(0, 3) // Return first 3 for immediate display
      });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
