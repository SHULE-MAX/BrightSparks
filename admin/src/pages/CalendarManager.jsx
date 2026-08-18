import { useMemo, useState } from 'react';
import { useCollection } from '../lib/useCollection.js';
import { longDate, todayISO } from '../lib/format.js';
import { PageHeader } from '../components/Layout.jsx';
import { EmptyState, LoadingList, RowActions, VisibilityToggle } from '../components/ListShell.jsx';
import { Button, ChoiceGrid, TextArea, TextInput, Toggle } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

// The four colours here are the ones calendar.html actually paints each dot
// with, so what the editor picks is what they will see on the website.
const EVENT_TYPES = [
  { value: 'key', label: 'Key date', note: 'Reporting day, term closure', color: '#E8A020' },
  { value: 'event-type', label: 'School event', note: 'Colour Day, Fun Day, tours', color: '#D32F2F' },
  { value: 'exam', label: 'Exams', note: 'Assessments and examinations', color: '#e05a1e' },
  { value: 'holiday', label: 'Public holiday', note: 'School closed', color: '#1a3a5c' },
];

const BLANK = {
  date: todayISO(),
  end_date: '',
  label: '',
  description: '',
  type: 'event-type',
  published: true,
};

export default function CalendarManager() {
  const collection = useCollection('events', { column: 'date', ascending: true }, 'event');
  const { rows, loading, save, remove, togglePublished } = collection;

  const [editing, setEditing] = useState(null); // form values, or null when closed
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  // Group by month so a long term reads the way a wall planner does.
  const months = useMemo(() => {
    const groups = new Map();
    for (const row of rows) {
      const key = row.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.entries()];
  }, [rows]);

  function open(row) {
    setErrors({});
    setEditing(row ? { ...row, end_date: row.end_date || '' } : { ...BLANK });
  }

  async function onSave() {
    const found = {};
    if (!editing.label.trim()) found.label = 'Give the event a name.';
    if (!editing.date) found.date = 'Choose the date.';
    if (editing.end_date && editing.end_date < editing.date) {
      found.end_date = 'The last day cannot be before the first day.';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const ok = await save(
      {
        date: editing.date,
        end_date: editing.end_date || null,
        label: editing.label.trim(),
        description: editing.description.trim(),
        type: editing.type,
        published: editing.published,
      },
      editing.id
    );
    setBusy(false);
    if (ok) setEditing(null);
  }

  async function onDelete() {
    setBusy(true);
    const ok = await remove(deleting.id);
    setBusy(false);
    if (ok) setDeleting(null);
  }

  return (
    <>
      <PageHeader
        title="School Calendar"
        description="Term dates, exams, holidays and school events. Anything added here appears straight away on the Calendar page of the website."
        action={<Button onClick={() => open(null)}>+ Add an event</Button>}
      />

      {loading && <LoadingList />}

      {!loading && rows.length === 0 && (
        <EmptyState
          icon="📅"
          title="No events yet"
          message="Add your first term date and it will appear on the school calendar immediately."
          action={<Button onClick={() => open(null)}>+ Add an event</Button>}
        />
      )}

      {!loading &&
        months.map(([month, monthRows]) => (
          <section key={month} className="mb-7">
            <h2 className="mb-2 text-xs font-bold tracking-widest text-ink-muted uppercase">
              {new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>

            <ul className="space-y-2.5">
              {monthRows.map((row) => {
                const type = EVENT_TYPES.find((t) => t.value === row.type);
                return (
                  <li
                    key={row.id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                      row.published ? '' : 'opacity-60'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-10 w-1.5 shrink-0 rounded-full"
                      style={{ background: type?.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{row.label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                        {longDate(row.date)}
                        {row.end_date && ` – ${longDate(row.end_date)}`}
                        {' · '}
                        {type?.label}
                      </p>
                      {row.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{row.description}</p>
                      )}
                    </div>
                    <VisibilityToggle
                      published={row.published}
                      onChange={() => togglePublished(row)}
                    />
                    <RowActions onEdit={() => open(row)} onDelete={() => setDeleting(row)} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit event' : 'Add an event'}
        subtitle="This appears on the calendar grid, the side panel and the full events table."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} busy={busy}>
              {editing?.id ? 'Save changes' : 'Add to calendar'}
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <TextInput
              label="Event name"
              hint="Keep it short — this is the label shown on the calendar."
              required
              error={errors.label}
              value={editing.label}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              placeholder="e.g. Mid-Term Exams"
            />

            <div className="grid items-end gap-x-4 sm:grid-cols-2">
              <TextInput
                label="Date"
                type="date"
                required
                error={errors.date}
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
              />
              <TextInput
                label="Last day"
                hint="Only for events lasting several days, such as tours. Leave empty otherwise."
                type="date"
                error={errors.end_date}
                value={editing.end_date}
                onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
              />
            </div>

            <ChoiceGrid
              label="What kind of event is this?"
              hint="This sets the colour it is shown in on the calendar."
              value={editing.type}
              onChange={(type) => setEditing({ ...editing, type })}
              options={EVENT_TYPES}
            />

            <TextArea
              label="Description"
              hint="One or two sentences explaining the event to parents."
              rows={3}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="e.g. Mid-term assessments for all classes"
            />

            <Toggle
              label="Show this on the website"
              hint="Turn off to prepare an event in advance without parents seeing it yet."
              checked={editing.published}
              onChange={(published) => setEditing({ ...editing, published })}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        what="event"
        itemName={deleting?.label}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </>
  );
}
