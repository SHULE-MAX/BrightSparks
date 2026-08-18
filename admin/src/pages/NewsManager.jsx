import { useMemo, useState } from 'react';
import { useCollection } from '../lib/useCollection.js';
import { BUCKETS, deleteUploadedFile, publicUrl, uploadFile } from '../lib/supabase.js';
import { plainText, shortDate, todayISO } from '../lib/format.js';
import { PageHeader } from '../components/Layout.jsx';
import { EmptyState, LoadingList, RowActions, VisibilityToggle } from '../components/ListShell.jsx';
import { Button, ChoiceGrid, Select, TextArea, TextInput, Toggle } from '../components/Field.jsx';
import FileDrop from '../components/FileDrop.jsx';
import RichText from '../components/RichText.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';

const CATEGORIES = [
  { value: 'academics', label: 'Academics', color: '#1A2E6E' },
  { value: 'sports', label: 'Sports', color: '#D32F2F' },
  { value: 'events', label: 'Events', color: '#1B6B3A' },
  { value: 'clubs', label: 'Clubs', color: '#E8A020' },
];

// Used only when an article has no photo — the website shows a coloured tile
// with an emoji instead of leaving a blank space.
const FALLBACK_COLORS = [
  { value: 'navy', label: 'Navy blue', color: '#1A2E6E' },
  { value: 'red', label: 'Red', color: '#D32F2F' },
  { value: 'green', label: 'Green', color: '#1B6B3A' },
  { value: 'gold', label: 'Gold', color: '#E8A020' },
  { value: 'sky', label: 'Sky blue', color: '#3B9FD4' },
];

const ICONS = ['📚', '⚽', '🎉', '🎨', '🏆', '📋', '🌙', '🍰', '✈️', '🎵', '📢', '📌'];

const BORDER_COLORS = [
  { value: 'var(--gold)', label: 'Gold', color: '#E8A020' },
  { value: 'var(--red)', label: 'Red', color: '#D32F2F' },
  { value: 'var(--navy)', label: 'Navy blue', color: '#1A2E6E' },
  { value: 'var(--green)', label: 'Green', color: '#1B6B3A' },
];

const BLANK = {
  date: todayISO(),
  category: 'academics',
  color: 'navy',
  icon: '📚',
  image_url: '',
  title: '',
  excerpt: '',
  body: '',
  pinned: false,
  pinned_label: '',
  border_color: 'var(--gold)',
  published: true,
};

export default function NewsManager() {
  const collection = useCollection('articles', { column: 'date', ascending: false }, 'article');
  const { rows, loading, save, remove, togglePublished } = collection;

  const [editing, setEditing] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const pinned = useMemo(() => rows.filter((r) => r.pinned), [rows]);
  const articles = useMemo(() => rows.filter((r) => !r.pinned), [rows]);

  function open(row) {
    setErrors({});
    setPendingImage(null);
    setEditing(row ? { ...row, image_url: row.image_url || '', pinned_label: row.pinned_label || '' } : { ...BLANK });
  }

  async function onSave() {
    const found = {};
    if (!editing.title.trim()) found.title = 'Give the article a headline.';
    if (!plainText(editing.body)) found.body = 'Write the article text.';
    if (!editing.pinned && !editing.excerpt.trim()) {
      found.excerpt = 'Write a short preview — this is what parents see on the news page.';
    }
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      let imageUrl = editing.image_url;
      if (pendingImage) {
        toast.info('Uploading the photo…');
        imageUrl = await uploadFile(BUCKETS.news, pendingImage);
      }

      const ok = await save(
        {
          date: editing.date,
          category: editing.category,
          color: editing.color,
          icon: editing.icon,
          image_url: imageUrl || null,
          title: editing.title.trim(),
          excerpt: editing.excerpt.trim(),
          body: editing.body,
          pinned: editing.pinned,
          pinned_label: editing.pinned ? editing.pinned_label.trim() || null : null,
          border_color: editing.border_color,
          published: editing.published,
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
    // Tidy up the stored photo too, but only if this dashboard uploaded it.
    if (ok) await deleteUploadedFile(BUCKETS.news, deleting.image_url).catch(() => {});
    setBusy(false);
    if (ok) setDeleting(null);
  }

  const isPinned = editing?.pinned;

  return (
    <>
      <PageHeader
        title="News"
        description="Articles and announcements for the news page. Pinned announcements appear in a highlighted box above everything else."
        action={<Button onClick={() => open(null)}>+ Write an article</Button>}
      />

      <p className="mb-6 rounded-xl border-l-4 border-sky bg-sky/10 px-4 py-3 text-sm leading-relaxed text-ink">
        <strong className="font-bold">Note:</strong> the news page also shows posts published on the
        school's separate WordPress blog. Those are not listed here — they are managed in WordPress.
      </p>

      {loading && <LoadingList />}

      {!loading && rows.length === 0 && (
        <EmptyState
          icon="📰"
          title="No articles yet"
          message="Write your first article and it will appear on the news page immediately."
          action={<Button onClick={() => open(null)}>+ Write an article</Button>}
        />
      )}

      {!loading && pinned.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-xs font-bold tracking-widest text-ink-muted uppercase">
            Pinned announcements
          </h2>
          <ul className="space-y-2.5">
            {pinned.map((row) => (
              <ArticleRow
                key={row.id}
                row={row}
                onEdit={() => open(row)}
                onDelete={() => setDeleting(row)}
                onToggle={() => togglePublished(row)}
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && articles.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold tracking-widest text-ink-muted uppercase">
            Articles ({articles.length})
          </h2>
          <ul className="space-y-2.5">
            {articles.map((row) => (
              <ArticleRow
                key={row.id}
                row={row}
                onEdit={() => open(row)}
                onDelete={() => setDeleting(row)}
                onToggle={() => togglePublished(row)}
              />
            ))}
          </ul>
        </section>
      )}

      <Modal
        open={Boolean(editing)}
        wide
        title={editing?.id ? 'Edit article' : 'Write an article'}
        subtitle="Everything here appears on the news page of the website."
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} busy={busy}>
              {editing?.id ? 'Save changes' : 'Publish article'}
            </Button>
          </>
        }
      >
        {editing && (
          <>
            <Toggle
              label="Make this a pinned announcement"
              hint="Pinned announcements sit in a highlighted box at the very top of the news page. Use this for urgent notices such as reporting dates or fee deadlines."
              checked={editing.pinned}
              onChange={(pinned) => setEditing({ ...editing, pinned })}
            />

            <TextInput
              label={isPinned ? 'Announcement heading' : 'Headline'}
              required
              error={errors.title}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder={isPinned ? 'e.g. Term II 2026 Begins May 25' : 'e.g. Football Team Wins Against St. James'}
            />

            {isPinned ? (
              <>
                <TextInput
                  label="Small label above the heading"
                  hint="Shown in capitals above the announcement. Leave empty if you don't need one."
                  value={editing.pinned_label}
                  onChange={(e) => setEditing({ ...editing, pinned_label: e.target.value })}
                  placeholder="📌 PINNED — May 2026"
                />
                <ChoiceGrid
                  label="Highlight colour"
                  hint="The colour of the stripe down the side of the announcement box."
                  value={editing.border_color}
                  onChange={(border_color) => setEditing({ ...editing, border_color })}
                  options={BORDER_COLORS}
                />
              </>
            ) : (
              <>
                <div className="grid items-end gap-x-4 sm:grid-cols-2">
                  <TextInput
                    label="Date"
                    hint="Articles are shown newest first."
                    type="date"
                    required
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                  <Select
                    label="Emoji shown when there is no photo"
                    value={editing.icon}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    options={ICONS.map((i) => ({ value: i, label: i }))}
                  />
                </div>

                <ChoiceGrid
                  label="Section"
                  hint="Parents use these to filter the news page."
                  value={editing.category}
                  onChange={(category) => setEditing({ ...editing, category })}
                  options={CATEGORIES}
                />

                <TextArea
                  label="Short preview"
                  hint="One or two sentences shown on the article card before someone opens it."
                  required
                  rows={2}
                  error={errors.excerpt}
                  value={editing.excerpt}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                />

                <FileDrop
                  label="Main photo"
                  hint="Optional, but articles with a photo get far more attention. It also appears in the website gallery under 'Blog'."
                  kind="image"
                  accept="image/*"
                  value={editing.image_url}
                  file={pendingImage}
                  onPick={setPendingImage}
                  onClear={() => {
                    setPendingImage(null);
                    setEditing({ ...editing, image_url: '' });
                  }}
                />

                {!editing.image_url && !pendingImage && (
                  <ChoiceGrid
                    label="Tile colour"
                    hint="Used behind the emoji when the article has no photo."
                    columns={3}
                    value={editing.color}
                    onChange={(color) => setEditing({ ...editing, color })}
                    options={FALLBACK_COLORS}
                  />
                )}
              </>
            )}

            <RichText
              label={isPinned ? 'Announcement text' : 'Article'}
              hint="Highlight words and use the buttons above to make them bold, add a link, or start a list."
              value={editing.body}
              error={errors.body}
              onChange={(body) => setEditing({ ...editing, body })}
            />

            <Toggle
              label="Show this on the website"
              hint="Turn off to save a draft that parents cannot see yet."
              checked={editing.published}
              onChange={(published) => setEditing({ ...editing, published })}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        what="article"
        itemName={deleting?.title}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={onDelete}
      />
    </>
  );
}

function ArticleRow({ row, onEdit, onDelete, onToggle }) {
  const category = CATEGORIES.find((c) => c.value === row.category);
  const fallback = FALLBACK_COLORS.find((c) => c.value === row.color);

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
        row.published ? '' : 'opacity-60'
      }`}
    >
      {row.image_url ? (
        <img
          src={publicUrl(row.image_url)}
          alt=""
          loading="lazy"
          className="h-16 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ background: row.pinned ? '#E8A020' : fallback?.color }}
        >
          {row.pinned ? '📌' : row.icon}
        </span>
      )}

      <div className="min-w-0 flex-1 basis-64">
        <p className="font-bold text-ink">{row.title}</p>
        <p className="mt-0.5 text-xs font-semibold text-ink-muted">
          {row.pinned ? 'Pinned announcement' : `${shortDate(row.date)} · ${category?.label}`}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
          {row.excerpt || plainText(row.body, 140)}
        </p>
      </div>

      <VisibilityToggle published={row.published} onChange={onToggle} />
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </li>
  );
}
