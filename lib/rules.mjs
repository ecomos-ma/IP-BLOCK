import { isIP } from 'node:net';
export const normalizeIP = value => String(value || '').trim().replace(/^::ffff:/i, '');
export const validIP = value => isIP(normalizeIP(value)) !== 0;
export function validHost(value) {
  const host = String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/:\d+$/, '').replace(/\.$/, '').replace(/\/$/, '');
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ? host : null;
}
export function blockedByRule(rule, ip, now = new Date()) {
  if (!rule.enabled || normalizeIP(rule.ip) !== normalizeIP(ip)) return false;
  const t = now.getTime();
  if (rule.starts_at && new Date(rule.starts_at).getTime() > t) return false;
  if (rule.expires_at && new Date(rule.expires_at).getTime() <= t) return false;
  return true;
}
export function decision(rules, ip, now = new Date()) {return rules.some(rule => blockedByRule(rule, ip, now)) ? 'block' : 'allow';}
export function expiryFromHours(hours, now = new Date()) {
  if (hours === null || hours === undefined || hours === '') return null;
  if (!Number.isInteger(hours) || hours < 1 || hours > 8760) throw Error('durationHours must be an integer from 1 to 8760');
  return new Date(now.getTime() + hours * 3_600_000).toISOString();
}
