import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { SelectField, TextField, Toggle } from './FormControls.jsx';

const TASK_CATEGORIES = [
  'Send proposal',
  'Review existing policy',
  'Check CPF statement',
  'Check SRS statement',
  'Review investment portfolio',
  'Send hospitalisation update',
  'Send policy illustration',
  'Arrange next meeting',
  'Send PDF summary',
  'Other',
];

const TASK_STATUSES = ['Not started', 'In progress', 'Completed'];

const QUICK_TASKS = [
  ['Send client summary PDF', 'Send PDF summary'],
  ['Send proposal', 'Send proposal'],
  ['Review existing policies', 'Review existing policy'],
  ['Check CPF balances', 'Check CPF statement'],
  ['Arrange next review', 'Arrange next meeting'],
  ['Follow up in 1 week', 'Other'],
];

export function FollowUpTasks({
  tasks,
  setTasks,
  includeFollowUpTasksInPdf,
  setIncludeFollowUpTasksInPdf,
}) {
  const addTask = (name = 'New follow-up task', category = 'Other') => {
    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        category,
        dueDate: '',
        status: 'Not started',
        notes: '',
      },
    ]);
  };
  const updateTask = (id, key, value) => setTasks((current) => current.map((task) => (
    task.id === id ? { ...task, [key]: value } : task
  )));
  const removeTask = (id) => setTasks((current) => current.filter((task) => task.id !== id));

  return (
    <section className="panel follow-up-panel">
      <div className="section-header">
        <div>
          <h2>Follow-Up Tasks</h2>
          <p className="section-subtext">Track actions after the client appointment.</p>
        </div>
        <button className="ghost-button" type="button" onClick={() => addTask()}>
          <Plus size={16} />
          Add Task
        </button>
      </div>

      <div className="quick-task-row">
        {QUICK_TASKS.map(([name, category]) => (
          <button className="quick-task" type="button" key={name} onClick={() => addTask(name, category)}>
            {name}
          </button>
        ))}
      </div>

      <div className="task-list">
        {tasks.length === 0 ? (
          <p className="empty-events">No follow-up tasks added yet.</p>
        ) : tasks.map((task) => (
          <div className={`task-card ${task.status === 'Completed' ? 'completed' : ''}`} key={task.id}>
            <button
              className="task-check"
              type="button"
              onClick={() => updateTask(task.id, 'status', task.status === 'Completed' ? 'Not started' : 'Completed')}
              aria-label={`Mark ${task.name} as completed`}
            >
              <CheckCircle2 size={18} />
            </button>
            <TextField label="Task name" value={task.name} onChange={(value) => updateTask(task.id, 'name', value)} />
            <SelectField label="Category" value={task.category} onChange={(value) => updateTask(task.id, 'category', value)} options={TASK_CATEGORIES} />
            <label className="field">
              <span>Due date</span>
              <input type="date" value={task.dueDate} onChange={(event) => updateTask(task.id, 'dueDate', event.target.value)} />
            </label>
            <SelectField label="Status" value={task.status} onChange={(value) => updateTask(task.id, 'status', value)} options={TASK_STATUSES} />
            <TextField label="Notes" value={task.notes} onChange={(value) => updateTask(task.id, 'notes', value)} />
            <button className="icon-button" type="button" onClick={() => removeTask(task.id)} aria-label="Delete task">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="follow-up-pdf-toggle">
        <Toggle
          label="Include follow-up tasks in PDF"
          checked={includeFollowUpTasksInPdf}
          onChange={setIncludeFollowUpTasksInPdf}
        />
      </div>
    </section>
  );
}
