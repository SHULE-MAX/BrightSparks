import { useRef, useState } from 'react';
import { fileSize } from '../lib/format.js';
import { publicUrl } from '../lib/supabase.js';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — comfortably above any school PDF or photo

/**
 * Drag-and-drop (or click-to-browse) file picker with an immediate preview.
 *
 * The file is deliberately NOT uploaded here — it is handed to the parent form
 * and only uploaded when the editor presses Save. That way abandoning a form
 * never leaves orphaned files sitting in storage.
 */
export default function FileDrop({
  label,
  hint,
  accept = 'image/*',
  kind = 'image',
  value, // already-saved URL or site-relative path
  file, // freshly chosen File, not yet uploaded
  onPick,
  onClear,
  required,
}) {
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState('');
  const inputRef = useRef(null);

  function accept_(picked) {
    setProblem('');
    if (!picked) return;

    if (picked.size > MAX_BYTES) {
      setProblem(
        `That file is ${fileSize(picked.size)}, which is too large. Please use one under 10 MB.`
      );
      return;
    }
    if (kind === 'image' && !picked.type.startsWith('image/')) {
      setProblem('That is not an image. Please choose a JPG, PNG or WEBP file.');
      return;
    }
    if (kind === 'pdf' && picked.type !== 'application/pdf') {
      setProblem('That is not a PDF. Please choose a PDF file.');
      return;
    }
    onPick(picked);
  }

  const previewSrc = file ? URL.createObjectURL(file) : publicUrl(value);
  const hasSomething = Boolean(file || value);

  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-sm font-bold text-ink">
        {label}
        {required && <span className="ml-1 text-brand-red">*</span>}
      </span>
      {hint && <p className="mb-1.5 text-xs leading-snug text-ink-muted">{hint}</p>}

      {hasSomething ? (
        <div className="flex items-center gap-4 rounded-xl border border-slate-300 bg-slate-50 p-3">
          {kind === 'image' ? (
            <img
              src={previewSrc}
              alt=""
              className="h-20 w-28 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
          ) : (
            <span aria-hidden="true" className="shrink-0 text-4xl">
              📄
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">
              {file ? file.name : decodeURIComponent((value || '').split('/').pop())}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {file
                ? `${fileSize(file.size)} · will be uploaded when you save`
                : 'Currently on the website'}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-navy underline"
              >
                Choose a different file
              </button>
              <button type="button" onClick={onClear} className="text-brand-red underline">
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept_(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${
            dragging ? 'border-navy bg-navy/5' : 'border-slate-300 bg-slate-50 hover:border-navy/50'
          }`}
        >
          <span aria-hidden="true" className="text-3xl">
            {kind === 'pdf' ? '📄' : '🖼️'}
          </span>
          <span className="text-sm font-bold text-navy">
            Drag a {kind === 'pdf' ? 'PDF' : 'photo'} here, or click to browse
          </span>
          <span className="text-xs text-ink-muted">
            {kind === 'pdf' ? 'PDF files' : 'JPG, PNG or WEBP'} up to 10 MB
          </span>
        </button>
      )}

      {problem && <p className="mt-1.5 text-xs font-semibold text-brand-red">{problem}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          accept_(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
