import { useState, useEffect, useCallback } from 'react';
import TaskBoard from './TaskBoard';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const VIEW_ICONS = {
  board: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="4" height="14" rx="1" />
      <rect x="6" y="1" width="4" height="10" rx="1" />
      <rect x="11" y="1" width="4" height="6" rx="1" />
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="2" rx="0.5" />
      <rect x="1" y="7" width="14" height="2" rx="0.5" />
      <rect x="1" y="12" width="14" height="2" rx="0.5" />
    </svg>
  ),
};

export default function TasksView({ agents }) {
  const [view, setView] = useState('board'); // 'board' or 'list'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTask, setEditingTask] = useState(null); // null, 'new', or task object

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Update task status (optimistic update)
  const handleUpdateTask = useCallback(async (taskId, updates) => {
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    ));

    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update task');
    } catch (err) {
      // Revert on error
      loadTasks();
      console.error('Failed to update task:', err);
    }
  }, [loadTasks]);

  // Save task (create or update)
  const handleSaveTask = useCallback(async (taskId, formData) => {
    if (taskId) {
      // Update existing
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update task');
      }
    } else {
      // Create new
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create task');
      }
    }
    await loadTasks();
  }, [loadTasks]);

  // Delete task
  const handleDeleteTask = useCallback(async (taskId) => {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete task');
    }
    await loadTasks();
  }, [loadTasks]);

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'accepted').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (loading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
      }}>
        Loading tasks...
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#080a10',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #1e2130',
        backgroundColor: '#0a0c14',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
            📋 Tasks
          </h2>
          
          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>
              {stats.total} total
            </span>
            <span style={{ color: '#f59e0b' }}>
              {stats.pending} pending
            </span>
            <span style={{ color: '#3b82f6' }}>
              {stats.inProgress} in progress
            </span>
            <span style={{ color: '#10b981' }}>
              {stats.completed} done
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: '#1a1d2e',
            borderRadius: 6,
            padding: 2,
          }}>
            {['board', 'list'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: view === v ? '#3b82f6' : 'transparent',
                  color: view === v ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                {VIEW_ICONS[v]}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* New task button */}
          <button
            onClick={() => setEditingTask('new')}
            style={{
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>+</span>
            New Task
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{error}</span>
          <button
            onClick={loadTasks}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'board' ? (
          <TaskBoard
            tasks={tasks}
            agents={agents}
            onUpdateTask={handleUpdateTask}
            onEditTask={setEditingTask}
          />
        ) : (
          <TaskList
            tasks={tasks}
            agents={agents}
            onUpdateTask={handleUpdateTask}
            onEditTask={setEditingTask}
          />
        )}
      </div>

      {/* Task detail modal */}
      {editingTask && (
        <TaskDetail
          task={editingTask === 'new' ? null : editingTask}
          agents={agents}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
