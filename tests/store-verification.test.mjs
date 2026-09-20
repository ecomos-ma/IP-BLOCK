import test from 'node:test';
import assert from 'node:assert/strict';
import { verificationTokenPresent } from '../lib/store-verification.ts';

test('store verification matches meta tag with token', () => {
  const token = '06bc7679-77aa-4f84-8c5b-f11581a570d0';
  const html = `
    <html>
      <head>
        <meta name="youcan-site-verification" content="${token}">
      </head>
    </html>
  `;

  assert.equal(verificationTokenPresent(html, token), true);
  assert.equal(verificationTokenPresent(html, 'different-token'), false);
});

test('store verification accepts the token in quoted meta content', () => {
  const token = 'abc123';
  const html = '<meta content="abc123" name="youcan-site-verification">';
  assert.equal(verificationTokenPresent(html, token), true);
});
