export function verificationTokenPresent(html: string, token: string): boolean {
  if (!html || !token) return false;

  const tokenPattern = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactMatches = [
    new RegExp(`name=["']youcan-site-verification["'][^>]*content=["']${tokenPattern}["']`, 'i'),
    new RegExp(`content=["']${tokenPattern}["'][^>]*name=["']youcan-site-verification["']`, 'i'),
    new RegExp(`name=["']youcan-site-verification["'][^>]*content=[^>]*${tokenPattern}`, 'i'),
    new RegExp(`content=["']${tokenPattern}["']`, 'i'),
  ];

  return exactMatches.some(pattern => pattern.test(html));
}
