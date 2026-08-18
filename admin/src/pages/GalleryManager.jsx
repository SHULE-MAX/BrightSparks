import { useMemo, useState } from 'react';
import { useCollection } from '../lib/useCollection.js';
import { BUCKETS, deleteUploadedFile, publicUrl, uploadFile } from '../lib/supabase.js';
import { PageHeader } from '../components/Layout.jsx';
import { EmptyState, LoadingList, VisibilityToggle } from '../components/ListShell.jsx';
import { Button, ChoiceGrid, TextInput, Toggle } from '../components/Field.jsx';
import FileDrop from '../components/FileDrop.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

// These are the five filter buttons that already exist on gallery.html.
const CATEGORIES = [
  { value: 'facilities', label: 'Facilities', color: '#1A2E6E' },
  { value: 'sports', label: 'Sports', color: '#D32F2F' },
  { value: 'events', label: 'Events', color: '#1B6B3A' },
  { value: 'staff', label: 'Staff', color: '#E8A020' },
  { value: 'blog', label: 'Blog', color: '#3B9FD4' },
];

const BLANK_PHOTO = {
  title: '',
  caption: '',
  category: 'facilities',
  image_url: '',
  published: true,
};

const BLANK_VIDEO = { tiktok_id: '', title: '', published: true };

export default function GalleryManager() {
  const photos = useCollection('gallery_photos', { column: 'position', ascending: true }, 'photo');
  const videos = useCollection('tiktok_videos', { column: 'position', ascending: true }, 'video');

  const [tab, setTab] = useState('photos');

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Photos and TikTok videos shown on the gallery page. Photos attached to news articles appear there automatically under 'Blog' — you do not need to add them twice."
      />

      <div className="mb-6 flex gap-2">
        {[
          { id: 'photos', label: `Photos (${photos.rows.length})` },
          { id: 'videos', label: `TikTok videos (${videos.rows.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === t.id
                ? 'bg-navy text-white'
                : 'border border-slate-300 bg-white text-ink-muted hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'photos' ? <Photos collection={photos} /> : <Videos collection={videos} />}
    </>
  );
}

// ── Photos ───────────────────────────────────────────────────────────────────

function Photos({ collection }) {
  const { rows, loading, save, remove, togglePublished, move, nextPosition } = collection;
  const [editing, setEditing] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  const ordered = useMemo(() => [...rows].sort((a, b) => a.position - b.position), [rows]);
  const shown = filter === 'all' ? ordered : ordered.filter((r) => r.category === filter);

  function open(row) {
    setErrors({});
    setPendingImage(null);
    setEditing(row ? { ...row } : { ...BLANK_PHOTO });
  }

  async function onSave() {
    const found = {};
    if (!editing.title.trim()) found.title = 'Give the photo a title.';
    if (!editing.image_url && !pendingImage) found.image = 'Choose a photo to upload.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      let imageUrl = editing.image_url;
      if (pendingImage) {
        toast.info('Uploading the photo…');
        imageUrl = await uploadFile(BUCKETS.gallery, pendingImage);
      }

      const category = editing.category;
      const ok = await save(
        {
          title: editing.title.trim(),
          // The caption is the small label under the title on the website.
          // Defaulting it to the section name keeps the grid looking uniform.
          caption:
            editing.caption.trim() || CATEGORIES.find((c) => c.value === category)?.label || '',
          category,
          image_url: imageUrl,
          published: editing.published,
          position: editing.position ?? nextPosition(),
        },
        editing.id
      );
      if (ok) setEditing(null);
    } catch (err) {
      toast.error(`The photo could not be uploaded. ${err.message || ''}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    const ok = await remove(deleting.id);
    if (ok) await deleteUploadedFile(BUCKETS.gallery, deleting.image_url).catch(() => {});
    setBusy(false);
    if (ok) setDeleting(null);
  }

  if (loading) return <LoadingList rows={3} />;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[{ value: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            aria-pressed={filter === c.value}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === c.value
                ? 'bg-navy text-white'
                : 'border border-slate-300 bg-white text-ink-muted hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
        <Button className="ml-auto" onClick={() => open(null)}>
          + Add a photo
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="No photos yet"
          message="Upload your first photo and it will appear in the website gallery straight away."
          action={<Button onClick={() => open(null)}>+ Add a photo</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((row) => {
            const index = ordered.findIndex((r) => r.id === row.id);
            const category = CATEGORIES.find((c) => c.value === row.category);
            return (
              <li
                key={row.id}
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
                  row.published ? '' : 'opacity-60'
                }`}
              >
                <img
                  src={publicUrl(row.image_url)}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-slate-100 object-cover"
                />
                <div className="p-3">
                  <p className="truncate font-bold text-ink" title={row.title}>
                    {row.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: category?.color }}
                    />
                    {category?.label}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <VisibilityToggle
                      published={row.published}
                      onChange={() => togglePublished(row)}
                    />
                    <div className="flex items-center gap-0.5">
                      <button
                        aria-label="Move earlier"
                        title="Move earlier"
                        disabled={index === 0}
                        onClick={() => move(row, 'up')}
                        className="rounded-lg px-1.5 py-1 text-sm text-ink-muted hover:bg-slate-200 disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        aria-label="Move later"
                        title="Move later"
                        disabled={index === ordered.length - 1}
                        onClick={() => move(row, 'down')}
                        className="rounded-lg px-1.5 py-1 text-sm text-ink-muted hover:bg-slate-200 disabled:opacity-30"
                      >
                        →
                      </button>
                      <button
                        onClick={() => open(row)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-navy hover:bg-navy/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleting(row)}
                        className="rounded-lg px-2 py-1 text-xs font-bold text-brand-red hover:bg-brand-red/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit photo' : 'Add a photo'}
        subtitle="Photos appear in the gallery grid and open full-size when clicked."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} busy={busy}>
              {editing?.id ? 'Save changes' : 'Add to gallery'}
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <FileDrop
              label="The photo"
              hint="Landscape photos look best. Very large photos are fine — they are resized automatically on the website."
              kind="image"
              accept="image/*"
              required
              value={editing.image_url}
              file={pendingImage}
              onPick={setPendingImage}
              onClear={() => {
                setPendingImage(null);
                setEditing({ ...editing, image_url: '' });
              }}
            />
            {errors.image && (
              <p className="-mt-2 mb-4 text-xs font-semibold text-brand-red">{errors.image}</p>
            )}

            <TextInput
              label="Title"
              hint="Shown when someone hovers over or opens the photo."
              required
              error={errors.title}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="e.g. Sports Day 2026"
            />

            <ChoiceGrid
              label="Section"
              hint="Visitors use these buttons to filter the gallery."
              columns={3}
              value={editing.category}
              onChange={(category) => setEditing({ ...editing, category })}
              options={CATEGORIES}
            />

            <TextInput
              label="Small label under the title"
              hint="Leave empty to use the section name."
              value={editing.caption}
              onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
              placeholder="e.g. Sports"
            />

            <Toggle
              label="Show this on the website"
              checked={editing.published}
              onChange={(published) => setEditing({ ...editing, published })}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        what="photo"
        itemName={deleting?.title}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </>
  );
}

// ── TikTok videos ────────────────────────────────────────────────────────────

function Videos({ collection }) {
  const { rows, loading, save, remove, togglePublished, nextPosition } = collection;
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  async function onSave() {
    // Accept either a pasted TikTok link or the bare number, and pull the id
    // out — asking an office user to find "the id" would be a trap.
    const id = (editing.tiktok_id.match(/(\d{6,})/) || [])[1];
    if (!id) {
      setErrors({ tiktok_id: 'Paste the full TikTok video link, or just the long number from it.' });
      return;
    }
    setErrors({});
    setBusy(true);
    const ok = await save(
      {
        tiktok_id: id,
        title: editing.title.trim(),
        published: editing.published,
        position: editing.position ?? nextPosition(),
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

  if (loading) return <LoadingList rows={2} />;

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setEditing({ ...BLANK_VIDEO })}>+ Add a video</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="No videos yet"
          message="Paste a link to one of the school's TikTok videos and it will play on the gallery page."
          action={<Button onClick={() => setEditing({ ...BLANK_VIDEO })}>+ Add a video</Button>}
        />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                row.published ? '' : 'opacity-60'
              }`}
            >
              <span aria-hidden="true" className="shrink-0 text-3xl">
                🎬
              </span>
              <div className="min-w-0 flex-1 basis-64">
                <p className="font-bold text-ink">{row.title || 'Untitled video'}</p>
                <a
                  href={`https://www.tiktok.com/@brightsparksjuniorschool/video/${row.tiktok_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block truncate text-xs font-semibold text-navy underline"
                >
                  Watch on TikTok
                </a>
              </div>
              <VisibilityToggle published={row.published} onChange={() => togglePublished(row)} />
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditing({ ...row })}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-navy hover:bg-navy/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleting(row)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand-red hover:bg-brand-red/10"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit video' : 'Add a TikTok video'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} busy={busy}>
              {editing?.id ? 'Save changes' : 'Add to gallery'}
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <TextInput
              label="TikTok video link"
              hint="On TikTok, open the video, press Share, then Copy link — and paste it here."
              required
              error={errors.tiktok_id}
              value={editing.tiktok_id}
              onChange={(e) => setEditing({ ...editing, tiktok_id: e.target.value })}
              placeholder="https://www.tiktok.com/@brightsparksjuniorschool/video/7560582960806694200"
            />
            <TextInput
              label="Title"
              hint="Shown under the video on the gallery page."
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="e.g. Sports Day highlights"
            />
            <Toggle
              label="Show this on the website"
              checked={editing.published}
              onChange={(published) => setEditing({ ...editing, published })}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        what="video"
        itemName={deleting?.title || 'This video'}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </>
  );
}
