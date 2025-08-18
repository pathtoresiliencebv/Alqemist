import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { executeQuery } from '@/lib/database';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.text();
  const body = JSON.parse(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;

    try {
      // Upsert user to database
      await executeQuery(`
        INSERT INTO users (id, email, name, avatar_url, preferences, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          preferences = EXCLUDED.preferences,
          updated_at = NOW()
      `, [
        id,
        email_addresses[0]?.email_address || '',
        `${first_name || ''} ${last_name || ''}`.trim() || email_addresses[0]?.email_address || '',
        image_url || '',
        JSON.stringify(public_metadata || {})
      ]);

      console.log(`User ${id} ${eventType === 'user.created' ? 'created' : 'updated'} in database`);
    } catch (error) {
      console.error(`Error ${eventType === 'user.created' ? 'creating' : 'updating'} user:`, error);
    }
  }

  return new Response('', { status: 200 });
}
