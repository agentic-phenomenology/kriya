import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

const STATUS_COLORS = {
  pending: '#f59e0b',
  accepted: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
};

export default function TaskList({ tasks, agents, onUpdateTask, onEditTask }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => [
    {
      accessorKey: 'task',
      header: 'Task',
      cell: ({ row }) => (
        <div
          onClick={() => onEditTask?.(row.original)}
          style={{ 
            cursor: 'pointer', 
            fontWeight: 500,
            color: '#e2e8f0',
          }}
        >
          {row.original.task}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <select
            value={status}
            onChange={(e) => onUpdateTask?.(row.original.id, { status: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1a1d2e',
              color: STATUS_COLORS[status] || '#e2e8f0',
              border: `1px solid ${STATUS_COLORS[status] || '#2a2d3e'}`,
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <option value="pending">Pending</option>
            <option value="accepted">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        );
      },
    },
    {
      accessorKey: 'from_agent',
      header: 'From',
      cell: ({ row }) => {
        const agent = agents.find(a => a.id === row.original.from_agent);
        if (!agent) return <span style={{ color: '#64748b' }}>—</span>;
        return (
          <span style={{
            fontSize: 12,
            padding: '3px 8px',
            borderRadius: 4,
            backgroundColor: agent.color || '#6366f1',
            color: '#fff',
            whiteSpace: 'nowrap',
          }}>
            {agent.icon || '🤖'} {agent.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'to_agent',
      header: 'To',
      cell: ({ row }) => {
        const agent = agents.find(a => a.id === row.original.to_agent);
        if (!agent) return <span style={{ color: '#64748b' }}>—</span>;
        return (
          <span style={{
            fontSize: 12,
            padding: '3px 8px',
            borderRadius: 4,
            backgroundColor: agent.color || '#6366f1',
            color: '#fff',
            whiteSpace: 'nowrap',
          }}>
            {agent.icon || '🤖'} {agent.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        const date = row.original.created_at;
        if (!date) return <span style={{ color: '#64748b' }}>—</span>;
        return (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => {
        const date = row.original.updated_at;
        if (!date) return <span style={{ color: '#64748b' }}>—</span>;
        return (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            {new Date(date).toLocaleDateString()}
          </span>
        );
      },
    },
  ], [agents, onUpdateTask, onEditTask]);

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search/filter bar */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search tasks..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 300,
            backgroundColor: '#1a1d2e',
            border: '1px solid #2a2d3e',
            borderRadius: 6,
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: 13,
          }}
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      backgroundColor: '#0f1219',
                      borderBottom: '1px solid #2a2d3e',
                      color: '#94a3b8',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted()] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                style={{
                  borderBottom: '1px solid #1a1d2e',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#12151f'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    style={{
                      padding: '12px',
                      color: '#e2e8f0',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {tasks.length === 0 && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div>No tasks yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Create a handoff between agents to see tasks here
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
