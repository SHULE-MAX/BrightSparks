import { useEffect, useRef } from 'react';

/**
 * A deliberately small rich-text box for writing article bodies.
 *
 * The website renders article bodies as HTML, so something has to produce that
 * HTML. Rather than ask a non-technical editor to type tags, this gives them
 * the six things a school newsletter actually needs and writes the markup for
 * them. document.execCommand is old, but it is supported in every current
 * browser and needs no editor library — a fair trade for a form this size.
 */
const TOOLS = [
  { cmd: 'bold', label: 'B', title: 'Bold', className: 'font-black' },
  { cmd: 'italic', label: 'I', title: 'Italic', className: 'italic font-serif' },
  { cmd: 'insertUnorderedList', label: '• List', title: 'Bulleted list' },
  { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
  { cmd: 'formatBlock', arg: '<h3>', label: 'Heading', title: 'Make this line a heading' },
  { cmd: 'formatBlock', arg: '<p>', label: '¶ Text', title: 'Back to normal text' },
];

export default function RichText({ label, hint, value, onChange, error }) {
  const ref = useRef(null);

  // Only write into the DOM when the incoming value genuinely differs, so
  // typing never resets the cursor to the start of the box.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  function run(tool) {
    ref.current?.focus();
    document.execCommand(tool.cmd, false, tool.arg);
    onChange(ref.current.innerHTML);
  }

  function addLink() {
    const selection = window.getSelection()?.toString();
    if (!selection) {
      // eslint-disable-next-line no-alert
      alert('First highlight the words you want to turn into a link, then press Link.');
      return;
    }
    // eslint-disable-next-line no-alert
    const url = prompt('Where should this link go?\n\nFor a page on this website type, for example: calendar.html', 'https://');
    if (!url) return;
    ref.current?.focus();
    document.execCommand('createLink', false, url);
    onChange(ref.current.innerHTML);
  }

  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-sm font-bold text-ink">
        {label}
        <span className="ml-1 text-brand-red">*</span>
      </span>
      {hint && <p className="mb-1.5 text-xs leading-snug text-ink-muted">{hint}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-navy-light focus-within:ring-2 focus-within:ring-navy-light/25">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={tool.title}
              onMouseDown={(e) => e.preventDefault()} // keep the text selection
              onClick={() => run(tool)}
              className={`rounded-lg px-2.5 py-1 text-xs text-ink-muted transition hover:bg-slate-200 hover:text-ink ${tool.className || 'font-bold'}`}
            >
              {tool.label}
            </button>
          ))}
          <button
            type="button"
            title="Turn the highlighted words into a link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addLink}
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-ink-muted transition hover:bg-slate-200 hover:text-ink"
          >
            🔗 Link
          </button>
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          data-placeholder="Write the full article here…"
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          // Paste as plain text, so copying from Word or WhatsApp doesn't drag
          // in fonts and colours that clash with the website's styling.
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            onChange(e.currentTarget.innerHTML);
          }}
          className="prose-bsjs min-h-52 max-w-none px-3.5 py-3 focus:outline-none"
        />
      </div>

      {error && <p className="mt-1.5 text-xs font-semibold text-brand-red">{error}</p>}
    </div>
  );
}
