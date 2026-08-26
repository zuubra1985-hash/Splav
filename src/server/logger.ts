/**
 * Structured Audit Logger for Security, Auth, and Administrative Events.
 * Produces structured JSON logs compliant with Google Cloud Logging / Cloud Run.
 */
import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';

export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_REGISTER'
  | 'AUTH_LOGOUT'
  | 'AUTH_REFRESH'
  | 'AUTH_REFRESH_FAILED'
  | 'PASSWORD_CHANGE'
  | 'ROLE_CHANGE'
  | 'USER_DELETE'
  | 'USER_PROFILE_UPDATE'
  | 'TRIP_CREATE'
  | 'TRIP_UPDATE'
  | 'TRIP_DELETE'
  | 'ROUTE_CREATE'
  | 'ROUTE_UPDATE'
  | 'ROUTE_DELETE'
  | 'ARTICLE_MUTATE'
  | 'ARTICLE_DELETE'
  | 'DATABASE_RESET'
  | 'SECURITY_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED';

export interface AuditLogData {
  eventType: AuditEventType;
  level?: 'info' | 'warn' | 'error';
  requestId?: string;
  userId?: string;
  userRole?: string;
  ip?: string;
  method?: string;
  path?: string;
  status?: number;
  message: string;
  details?: Record<string, any>;
}

function sanitizeLogMessage(msg: string): string {
  if (!msg) return msg;
  // P0-6: Mask email addresses in audit messages
  return msg.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]');
}

export function logAudit(data: AuditLogData) {
  const timestamp = new Date().toISOString();
  const level = data.level || (data.eventType.includes('FAILED') || data.eventType.includes('VIOLATION') ? 'warn' : 'info');
  const safeMessage = sanitizeLogMessage(data.message);

  const logEntry = {
    timestamp,
    severity: level.toUpperCase(),
    level,
    eventType: data.eventType,
    requestId: data.requestId || 'system',
    userId: data.userId || null,
    userRole: data.userRole || null,
    ip: data.ip || null,
    method: data.method || null,
    path: data.path || null,
    status: data.status || null,
    message: safeMessage,
    details: data.details || {}
  };

  // 1. Output structured JSON to console for Cloud Run stdout capturing
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }

  // 2. Asynchronously insert to PostgreSQL audit_logs table (fail-safe)
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.insert(auditLogs).values({
      id,
      eventType: data.eventType,
      level,
      userId: data.userId || null,
      userRole: data.userRole || null,
      ip: data.ip || null,
      requestId: data.requestId || null,
      message: safeMessage,
      details: data.details || {},
      createdAt: new Date()
    }).catch((err) => {
      // Non-blocking log insertion failure fallback
      console.error('[Audit Log DB Write Error]', err?.message || err);
    });
  } catch (err) {
    // Non-blocking
  }
}
