type AuditStatus = 'denied' | 'success' | 'failed';

export function auditLog(params: {
  action: 'create' | 'update' | 'delete';
  resource: string;
  resourceId?: string;
  status: AuditStatus;
  userId?: string;
  userEmail?: string;
  role?: string;
  message?: string;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...params,
  };

  // Keep it structured for easy parsing in terminal / log collectors.
  console.info('[AUDIT]', JSON.stringify(payload));
}
