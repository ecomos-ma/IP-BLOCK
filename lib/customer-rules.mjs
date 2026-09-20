/**
 * Moroccan phone number normalization and customer rule logic (ES module)
 */
export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[\s\-().+]/g, '');
  if (!/^\d{9,15}$/.test(digits)) return null;

  if (/^(?:00212|212)(\d{9})$/.test(digits)) {
    return '+212' + RegExp.$1;
  }
  if (/^0([67]\d{8})$/.test(digits)) {
    return '+212' + RegExp.$1;
  }
  if (/^\d{10,15}$/.test(digits)) {
    return '+' + digits;
  }
  return null;
}

export function normalizeName(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeAddress(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeCustomerValue(type, value) {
  switch (type) {
    case 'phone': return normalizePhone(value) || String(value || '').trim().toLowerCase();
    case 'name':  return normalizeName(value);
    case 'address': return normalizeAddress(value);
    case 'address_contains': return String(value || '').trim().toLowerCase();
    default: return String(value || '').trim().toLowerCase();
  }
}

export function customerRuleMatches(rule, order, now = new Date()) {
  if (!rule.enabled) return false;
  if (rule.expires_at && new Date(rule.expires_at).getTime() <= now.getTime()) return false;

  switch (rule.rule_type) {
    case 'phone': {
      if (!order.phone) return false;
      const norm = normalizePhone(order.phone) || String(order.phone).trim().toLowerCase();
      return norm === rule.normalized_value;
    }
    case 'name': {
      if (!order.name) return false;
      return normalizeName(order.name) === rule.normalized_value;
    }
    case 'address': {
      if (!order.address) return false;
      return normalizeAddress(order.address) === rule.normalized_value;
    }
    case 'address_contains': {
      if (!order.address) return false;
      return normalizeAddress(order.address).includes(rule.normalized_value);
    }
    default: return false;
  }
}
