import { supabase } from './supabase.js';

/**
 * Asks the server to have the website's news pages rebuilt now.
 *
 * WHY THIS IS NEEDED AT ALL
 * The public site is static HTML on cPanel, not this dashboard. Saving a story
 * puts it in the database; it becomes a page at brightsparksjunior.ac.ug only
 * when the Build news pages workflow runs and uploads it. That workflow is also
 * on a timer, so this is the difference between the story appearing in about a
 * minute and appearing within a quarter of an hour.
 *
 * WHY IT GOES THROUGH OUR OWN SERVER
 * Starting the workflow needs a GitHub token, and this file runs in a browser
 * where nothing can be kept secret. The token lives in the server's environment
 * instead (see server.js); all this does is ask, proving who is asking with the
 * signed-in user's own session.
 *
 * NEVER THROWS
 * The article is already saved by the time this runs. If the rebuild cannot be
 * asked for — the server is old, the token is missing, the network dropped —
 * that is a slower publication, not a lost one: the timer still picks it up.
 * So this reports what happened and leaves the caller's success alone.
 *
 * @returns {Promise<'now'|'shortly'|'timer'>} 'now' and 'shortly' mean a build
 *   is coming; 'timer' means the request did not get through and the story will
 *   wait for the scheduled run.
 */
export async function requestRebuild() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return 'timer';

    const res = await fetch('/api/rebuild', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return 'timer';
    const body = await res.json().catch(() => ({}));
    return body.when === 'now' || body.when === 'shortly' ? body.when : 'timer';
  } catch {
    return 'timer';
  }
}
