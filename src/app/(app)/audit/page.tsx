'use client';
import { useState } from 'react';
import { useTable } from '@/lib/hooks';
import { fmtDateTime } from '@/lib/format';
import { Avatar, Badge, PageHeader, RequireRole, Select, Table, td } from '@/components/ui';

export default function AuditPage() {
  return (
    <RequireRole roles={['super_admin']}>
      <Audit />
    </RequireRole>
  );
}

function Audit() {
  const log = useTable('audit_log', { order: ['created_at', 'desc'], limit: 500 });
  const profiles = useTable('profiles');
  const [entity, setEntity] = useState('all');
  const entities = Array.from(new Set(log.rows.map((l) => l.entity))).sort();
  const rows = log.rows.filter((l) => entity === 'all' || l.entity === entity);
  const who = (id: string | null) => (id ? profiles.rows.find((p) => p.id === id)?.full_name ?? 'Unknown' : 'System');

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Every create, update and delete on core records (last 500)"
        actions={
          <Select className="w-48" value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="all">All entities</option>
            {entities.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </Select>
        }
      />
      <Table head={['When', 'Who', 'Action', 'Entity', 'Record']}>
        {rows.map((l) => (
          <tr key={l.id}>
            <td className={`${td} whitespace-nowrap`}>{fmtDateTime(l.created_at)}</td>
            <td className={td}>
              <span className="flex items-center gap-2">
                <Avatar name={who(l.actor_id)} size={22} /> {who(l.actor_id)}
              </span>
            </td>
            <td className={td}>
              <Badge tone={l.action === 'insert' ? 'green' : l.action === 'delete' ? 'red' : 'amber'}>{l.action}</Badge>
            </td>
            <td className={td}>{l.entity}</td>
            <td className={`${td} max-w-sm truncate text-neutral-600`}>{l.summary || l.entity_id}</td>
          </tr>
        ))}
      </Table>
      {!rows.length && <p className="mt-4 text-center text-sm text-neutral-500">No activity yet. Changes you make anywhere in the app show up here.</p>}
    </div>
  );
}
