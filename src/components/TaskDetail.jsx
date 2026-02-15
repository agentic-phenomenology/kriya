import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'accepted', label: 'In Progress', color: '#3b82f6' },
  { value: 'completed', label: 'Completed', color: '#10b981' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
];

export default function TaskDetail({ task, agents, onSave, onDelete, onClose }) {
  const [formData, setFormData] = useState({
    task: '',
    from_agent: '',
    to_agent: '',
    status: 'pending',
    result: '',
    context: {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        task: task.task || '',
        from_agent: task.from_agent || '',
        to_agent: task.to_agent || '',
        status: task.status || 'pending',
        result: task.result || '',
        context: task.context || {},
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      await onSave(task?.id, formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await onDelete(task.id);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const isNew = !task?.id;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        backgroundColor: '#0f1219',
        borderRadius: 12,
        width: '90%',
        maxWidth: 520,
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #2a2d3e',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #1a1d2e',
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
            {isNew ? 'New Task' : 'Edit Task'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 6,
              color: '#f87171',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Task description */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: 6,
            }}>
              Task Description
            </label>
            <textarea
              value={formData.task}
              onChange={e => setFormData(f => ({ ...f, task: e.target.value }))}
              placeholder="What needs to be done?"
              required
              rows={3}
              style={{
                width: '100%',
                backgroundColor: '#1a1d2e',
                border: '1px solid #2a2d3e',
                borderRadius: 6,
                padding: '10px 12px',
                color: '#e2e8f0',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* From/To agents */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: 6,
              }}>
                From Agent
              </label>
              <select
                value={formData.from_agent}
                onChange={e => setFormData(f => ({ ...f, from_agent: e.target.value }))}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#1a1d2e',
                  border: '1px solid #2a2d3e',
                  borderRadius: 6,
                  padding: '10px 12px',
                  color: '#e2e8f0',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.icon || '🤖'} {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: 6,
              }}>
                To Agent
              </label>
              <select
                value={formData.to_agent}
                onChange={e => setFormData(f => ({ ...f, to_agent: e.target.value }))}
                required
                style={{
                  width: '100%',
                  backgroundColor: '#1a1d2e',
                  border: '1px solid #2a2d3e',
                  borderRadius: 6,
                  padding: '10px 12px',
                  color: '#e2e8f0',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <option value="">Select agent...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.icon || '🤖'} {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: '#94a3b8',
              marginBottom: 6,
            }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, status: opt.value }))}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: formData.status === opt.value 
                      ? `2px solid ${opt.color}`
                      : '1px solid #2a2d3e',
                    backgroundColor: formData.status === opt.value 
                      ? `${opt.color}20`
                      : '#1a1d2e',
                    color: formData.status === opt.value ? opt.color : '#94a3b8',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result (for completed tasks) */}
          {(formData.status === 'completed' || formData.result) && (
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: 6,
              }}>
                Result / Notes
              </label>
              <textarea
                value={formData.result}
                onChange={e => setFormData(f => ({ ...f, result: e.target.value }))}
                placeholder="Outcome or notes..."
                rows={2}
                style={{
                  width: '100%',
                  backgroundColor: '#1a1d2e',
                  border: '1px solid #2a2d3e',
                  borderRadius: 6,
                  padding: '10px 12px',
                  color: '#e2e8f0',
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'space-between',
            marginTop: 24,
          }}>
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: '1px solid #ef4444',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            )}
            
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: '1px solid #2a2d3e',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving...' : (isNew ? 'Create Task' : 'Save Changes')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
