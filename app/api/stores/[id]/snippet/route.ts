import { json } from '../../../../../lib/db';
import { ownedStore } from '../../../../../lib/ownership';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await ownedStore(request, id);
  if (access.error) return access.error;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const reqUrl = new URL(request.url);
  const hostUrl = siteUrl || reqUrl.origin;

  if (!siteUrl && (hostUrl.includes('localhost') || hostUrl.includes('127.0.0.1'))) {
    // Return warnings if localhost is detected for production snippets
    // But still provide snippet with placeholder warning comment
  }

  const snippet = `<!-- YouCan Remote Code Manager Bootstrap — Install ONCE in Additional Header Code -->
<style>
html.ycm-protection-wait body { visibility: hidden !important; }
html.ycm-protection-denied body > :not(#ycm-protection-curtain) { display: none !important; }
</style>
<script>
(function(){
  var s = document.createElement('script');
  s.src = "${hostUrl}/bootstrap.js";
  s.setAttribute('data-store-id', "${access.store.id}");
  s.async = false;
  document.head.appendChild(s);
})();
</script>`;

  return json({
    storeId: access.store.id,
    hostname: access.store.hostname,
    snippet,
    hostUrl,
  });
}
