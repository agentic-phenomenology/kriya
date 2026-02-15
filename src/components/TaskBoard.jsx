import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMNS = [
  { id: 'pending', title: 'Pending', color: '#f59e0b' },
  { id: 'accepted', title: 'In Progress', color: '#3b82f6' },
  { id: 'completed', title: 'Completed', color: '#10b981' },
  { id: 'rejected', title: 'Rejected', color: '#ef4444' },
];

// Sortable task card
function SortableTask({ task, agents, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} agents={agents} onEdit={onEdit} />
    </div>
  );
}

// Task card component
function TaskCard({ task, agents, onEdit, isDragOverlay }) {
  const fromAgent = agents.find(a => a.id === task.from_agent);
  const toAgent = agents.find(a => a.id === task.to_agent);

  return (
    <div
      onClick={() => !isDragOverlay && onEdit?.(task)}
      style={{
        backgroundColor: '#1a1d2e',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 8,
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        border: '1px solid #2a2d3e',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isDragOverlay ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
      }}
      onMouseEnter={e => {
        if (!isDragOverlay) {
          e.currentTarget.style.borderColor = '#3b82f6';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#2a2d3e';
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', marginBottom: 8 }}>
        {task.task}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {fromAgent && (
          <span style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: fromAgent.color || '#6366f1',
            color: '#fff',
          }}>
            {fromAgent.icon || '🤖'} {fromAgent.name}
          </span>
        )}
        
        <span style={{ color: '#475569', fontSize: 11 }}>→</span>
        
        {toAgent && (
          <span style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            backgroundColor: toAgent.color || '#6366f1',
            color: '#fff',
          }}>
            {toAgent.icon || '🤖'} {toAgent.name}
          </span>
        )}
      </div>
      
      {task.created_at && (
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
          {new Date(task.created_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

// Column component
function Column({ column, tasks, agents, onEdit }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 260,
      maxWidth: 320,
      backgroundColor: '#0f1219',
      borderRadius: 10,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: `2px solid ${column.color}`,
      }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: column.color,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
          {column.title}
        </span>
        <span style={{
          fontSize: 11,
          color: '#64748b',
          marginLeft: 'auto',
          backgroundColor: '#1a1d2e',
          padding: '2px 8px',
          borderRadius: 10,
        }}>
          {tasks.length}
        </span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 100 }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTask key={task.id} task={task} agents={agents} onEdit={onEdit} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: '#475569',
            fontSize: 12,
            border: '1px dashed #2a2d3e',
            borderRadius: 8,
          }}>
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks, agents, onUpdateTask, onEditTask }) {
  const [activeId, setActiveId] = useState(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const findContainer = (id) => {
    if (COLUMNS.some(c => c.id === id)) return id;
    for (const status of COLUMNS.map(c => c.id)) {
      if (tasksByStatus[status].some(t => t.id === id)) {
        return status;
      }
    }
    return null;
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Moving to a different column - update status
    const task = tasks.find(t => t.id === active.id);
    if (task && onUpdateTask) {
      onUpdateTask(task.id, { status: overContainer });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (activeContainer !== overContainer) {
      // Already handled in dragOver
      return;
    }

    // Reorder within same column (optional - we don't persist order currently)
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        display: 'flex',
        gap: 12,
        padding: 16,
        overflowX: 'auto',
        height: '100%',
      }}>
        {COLUMNS.map(column => (
          <Column
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            agents={agents}
            onEdit={onEditTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} agents={agents} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
