import { useMemo, useState } from 'react';
import { useCollection } from '../lib/useCollection.js';
import { BUCKETS, deleteUploadedFile, publicUrl, uploadFile } from '../lib/supabase.js';
import { fileSize } from '../lib/format.js';
import { PageHeader } from '../components/Layout.jsx';
import { EmptyState, LoadingList, RowActions, VisibilityToggle } from '../components/ListShell.jsx';
import { Button, ChoiceGrid, TextArea, TextInput, Toggle } from '../components/Field.jsx';
import FileDrop from '../components/FileDrop.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

// These match the four badge colours already used on resources.html.
const CATEGORIES = [
  { value: 'circular', label: 'Circular', note: 'Letters to parents', color: '#1A2E6E' },
  { value: 'rules', label: 'Rules & Regulations', note: 'Conduct and expectations', color: '#D32F2F' },
  { value: 'newsletter', label: 'Newsletter', note: 'Termly round-ups', color: '#1B6B3A' },
  { value: 'workplan', label: 'Workplan & Routine', note: 'Timetables and routines', color: '#E8A020' },
];

const BLANK = {
  title: '',
  description: '',
  category: 'circular',
  meta_label: '',
  file_url: '',
  file_size_bytes: null,
  published: true,
};

export default function ResourcesManager() {
  const collection = useCollection('resources', { column: 'position', ascending: true }, 'document');
  const { rows, loading, save, remove, togglePublished, move, nextPosition } = collection;

  const [editing, setEditing] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const ordered = useMemo(() => [...rows].sort((a, b) => a.position - b.position), [rows]);

  function open(row) {
    setErrors({});
    setPendingFile(null);
    setEditing(row ? { ...row, meta_label: row.meta_label || '' } : { ...BLANK });
  }

  async function onSave() {
    const found = {};
    if (!editing.title.trim()) found.title = 'Give the document a name.';
    if (!editing.file_url && !pendingFile) found.file = 'Choose the PDF file to upload.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      let fileUrl = editing.file_url;
      let sizeBytes = editing.file_size_bytes;

      if (pendingFile) {
        toast.info('Uploading the PDF…');
        fileUrl = await uploadFile(BUCKETS.resources, pendingFile);
        sizeBytes = pendingFile.size; // shown on the download button
      }

      const ok = await save(
        {
          title: editing.title.trim(),
          description: editing.description.trim(),
          category: editing.category,
          meta_label: editing.meta_label.trim(),
          file_url: fileUrl,
          file_size_bytes: sizeBytes,
          published: editing.published,
          position: editing.position ?? nextPosition(),
        },
        editing.id
      );
      if (ok) setEditing(null);
    } catch (err) {
      toast.error(`The PDF could not be uploaded. ${err.message || ''}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    const ok = await remove(deleting.id);
    if (ok) await deleteUploadedFile(BUCKETS.resources, deleting.file_url).catch(() => {});
    setBusy(false);
    if (ok) setDeleting(null);
  }

  return (
    <>
      <PageHeader
        title="Resources"
        description="The PDF documents parents download — circulars, newsletters, rules and routines. Use the arrows to change the order they appear in."
        action={<Button onClick={() => open(null)}>+ Add a document</Button>}
      />

      {loading && <LoadingList rows={3} />}

      {!loading && rows.length === 0 && (
        <EmptyState
          icon="📄"
          title="No documents yet"
          message="Upload a PDF and parents will be able to download it from the Resources page straight away."
          action={<Button onClick={() => open(null)}>+ Add a document</Button>}
        />
      )}

      {!loading && ordered.length > 0 && (
        <ul className="space-y-2.5">
          {ordered.map((row, i) => {
            const category = CATEGORIES.find((c) => c.value === row.category);
            return (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                  row.published ? '' : 'opacity-60'
                }`}
              >
                <span aria-hidden="true" className="shrink-0 text-3xl">
                  📄
                </span>

                <div className="min-w-0 flex-1 basis-64">
                  <p className="font-bold text-ink">{row.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
                    <span
                      className="rounded-md px-2 py-0.5 text-white"
                      style={{ background: category?.color }}
                    >
                      {category?.label}
                    </span>
                    {row.meta_label && <span>{row.meta_label}</span>}
                    {row.file_size_bytes ? <span>PDF · {fileSize(row.file_size_bytes)}</span> : null}
                  </p>
                  {row.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{row.description}</p>
                  )}
                  <a
                    href={publicUrl(row.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-block text-xs font-bold text-navy underline"
                  >
                    Open this PDF
                  </a>
                </div>

                <VisibilityToggle published={row.published} onChange={() => togglePublished(row)} />
                <RowActions
                  onEdit={() => open(row)}
                  onDelete={() => setDeleting(row)}
                  onMoveUp={() => move(row, 'up')}
                  onMoveDown={() => move(row, 'down')}
                  canMoveUp={i > 0}
                  canMoveDown={i < ordered.length - 1}
                />
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit document' : 'Add a document'}
        subtitle="This becomes a download card on the Resources page."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} busy={busy}>
              {editing?.id ? 'Save changes' : 'Publish document'}
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <FileDrop
              label="The PDF file"
              hint="This is the file parents will download."
              kind="pdf"
              accept="application/pdf"
              required
              value={editing.file_url}
              file={pendingFile}
              onPick={setPendingFile}
              onClear={() => {
                setPendingFile(null);
                setEditing({ ...editing, file_url: '', file_size_bytes: null });
              }}
            />
            {errors.file && (
              <p className="-mt-2 mb-4 text-xs font-semibold text-brand-red">{errors.file}</p>
            )}

            <TextInput
              label="Document name"
              hint="What parents will see on the download card."
              required
              error={errors.title}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="e.g. Term II Roadmap Circular"
            />

            <ChoiceGrid
              label="What kind of document is this?"
              hint="This sets the coloured badge on the card."
              value={editing.category}
              onChange={(category) => setEditing({ ...editing, category })}
              options={CATEGORIES}
            />

            <TextInput
              label="Period or version"
              hint="Small note shown beside the file size, so parents know which term it belongs to."
              value={editing.meta_label}
              onChange={(e) => setEditing({ ...editing, meta_label: e.target.value })}
              placeholder="e.g. Term II 2026"
            />

            <TextArea
              label="Description"
              hint="A sentence or two explaining what is inside the document."
              rows={3}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />

            <Toggle
              label="Show this on the website"
              hint="Turn off to upload a document in advance without parents seeing it yet."
              checked={editing.published}
              onChange={(published) => setEditing({ ...editing, published })}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        what="document"
        itemName={deleting?.title}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </>
  );
}
