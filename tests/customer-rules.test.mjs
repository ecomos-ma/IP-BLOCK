import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, normalizeName, normalizeAddress, customerRuleMatches } from '../lib/customer-rules.mjs';

test('Moroccan phone normalization', () => {
  assert.equal(normalizePhone('0612345678'), '+212612345678');
  assert.equal(normalizePhone('0712345678'), '+212712345678');
  assert.equal(normalizePhone('212612345678'), '+212612345678');
  assert.equal(normalizePhone('00212612345678'), '+212612345678');
  assert.equal(normalizePhone('+212612345678'), '+212612345678');
  assert.equal(normalizePhone('invalid'), null);
});

test('Customer name and address normalization', () => {
  assert.equal(normalizeName('  John  Doe  '), 'john doe');
  assert.equal(normalizeAddress('  123   Main   St  '), '123 main st');
});

test('Customer rule matching', () => {
  const rule = {
    rule_type: 'phone',
    normalized_value: '+212612345678',
    enabled: true,
    expires_at: null,
  };

  assert.equal(customerRuleMatches(rule, { phone: '0612345678' }), true);
  assert.equal(customerRuleMatches(rule, { phone: '0699999999' }), false);
  assert.equal(customerRuleMatches({ ...rule, enabled: false }, { phone: '0612345678' }), false);
});
