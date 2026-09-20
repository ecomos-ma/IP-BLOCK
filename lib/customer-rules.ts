// @ts-ignore
import { normalizePhone as _normalizePhone, normalizeName as _normalizeName, normalizeAddress as _normalizeAddress, normalizeCustomerValue as _normalizeCustomerValue, customerRuleMatches as _customerRuleMatches } from './customer-rules.mjs';
import type { CustomerRuleType } from './types';

export const normalizePhone: (raw: string) => string | null = _normalizePhone;
export const normalizeName: (raw: string) => string = _normalizeName;
export const normalizeAddress: (raw: string) => string = _normalizeAddress;
export const normalizeCustomerValue: (type: CustomerRuleType, value: string) => string = _normalizeCustomerValue;
export const customerRuleMatches: (
  rule: { rule_type: CustomerRuleType; normalized_value: string; enabled: boolean; expires_at: string | null },
  order: { phone?: string; name?: string; address?: string },
  now?: Date
) => boolean = _customerRuleMatches;
