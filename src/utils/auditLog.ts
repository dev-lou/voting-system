const AUDIT_LOG_KEY = "audit-log";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export function getAuditLog(): AuditEntry[] {
  try {
    const raw = sessionStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAuditEntry(actor: string, action: string, details: string): void {
  const entry: AuditEntry = {
    id: crypto.randomUUID().slice(0, 8),
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
  };
  const log = getAuditLog();
  log.unshift(entry);
  sessionStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log.slice(0, 200)));
}

export function clearAuditLog(): void {
  sessionStorage.removeItem(AUDIT_LOG_KEY);
}
