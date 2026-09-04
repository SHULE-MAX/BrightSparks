import { useEffect, useRef, useState } from 'react';

/**
 * A deliberately small rich-text box for writing article bodies.
 *
 * The website renders article bodies as HTML, so something has to produce that
 * HTML. Rather than ask a non-technical editor to type tags, this gives them
 * the things a school newsletter actually needs — including tables, which are
 * how fee schedules, term dates and results lists are written — and produces
 * the markup for them. document.execCommand is old, but it is supported in
 * every current browser and needs no editor library; the only thing it cannot
 * do is tables, so those are built and edited by hand below.
 *
 * Every tag produced here already has matching styling in news-article.css
 * (article pages) and in news.html's .ann-body block (pinned announcements),
 * so nothing written in this box can arrive on the website unstyled.
 */

/* Buttons that are nothing more than a browser command. */
const TOOLS = [
  { cmd: 'bold', label: 'B', title: 'Bold', className: 'font-black' },
  { cmd: 'italic', label: 'I', title: 'Italic', className: 'italic font-serif' },
  { cmd: 'underline', label: 'U', title: 'Underline', className: 'underline' },
  { sep: true },
  { cmd: 'formatBlock', arg: '<h2>', label: 'Heading', title: 'Make this line a big heading' },
  { cmd: 'formatBlock', arg: '<h3>', label: 'Subheading', title: 'Make this line a smaller heading' },
  { cmd: 'formatBlock', arg: '<p>', label: '¶ Text', title: 'Back to normal text' },
  { sep: true },
  { cmd: 'insertUnorderedList', label: '• List', title: 'Bulleted list' },
  { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
  { cmd: 'formatBlock', arg: '<blockquote>', label: '❝ Quote', title: 'Set this apart as a quote' },
];

const MAX_COLS = 6;
const MAX_ROWS = 8;

/** The <td>/<th> the cursor is sitting in, or null when it is not in a table. */
function cellAt(node, root) {
  let el = node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== root) {
    if (el.tagName === 'TD' || el.tagName === 'TH') return el;
    el = el.parentElement;
  }
  return null;
}

const escapeText = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Empty cells need something inside them, or they cannot be clicked into. */
const blankCell = (tag) => `<${tag}><br></${tag}>`;

function tableHtml(rows, cols, cells) {
  const head =
    '<thead><tr>' +
    Array.from({ length: cols }, (_, c) =>
      cells ? `<th>${escapeText(cells[0][c] ?? '')}</th>` : blankCell('th')
    ).join('') +
    '</tr></thead>';

  const body =
    '<tbody>' +
    Array.from({ length: rows - 1 }, (_, r) =>
      '<tr>' +
      Array.from({ length: cols }, (_, c) =>
        cells ? `<td>${escapeText(cells[r + 1]?.[c] ?? '')}</td>` : blankCell('td')
      ).join('') +
      '</tr>'
    ).join('') +
    '</tbody>';

  // The trailing paragraph is an escape hatch: without it a table pasted at the
  // very end of an article leaves nowhere to put the cursor afterwards.
  return `<table>${head}${body}</table><p><br></p>`;
}

/**
 * Text copied out of Excel or Google Sheets arrives as tab-separated lines.
 * Turning that back into a table is what the person pasting expects, and is by
 * far the easiest way for staff to get a fee table onto the website.
 */
function gridFromPastedText(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
  if (lines.length < 2 || !lines.every((line) => line.includes('\t'))) return null;

  const rows = lines.map((line) => line.split('\t'));
  const cols = Math.max(...rows.map((r) => r.length));
  if (cols < 2) return null;
  return { rows, cols };
}

export default function RichText({ label, hint, value, onChange, error }) {
  const ref = useRef(null);
  const savedRange = useRef(null);
  const [picker, setPicker] = useState(null); // { rows, cols } being hovered
  const [inTable, setInTable] = useState(false);

  // Only write into the DOM when the incoming value genuinely differs, so
  // typing never resets the cursor to the start of the box.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  /* Clicking a toolbar button moves focus out of the box for an instant, and
     opening the table picker moves it for longer than that. Remembering where
     the cursor was means every button still acts on the right words. */
  useEffect(() => {
    function remember() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !ref.current) return;
      const range = sel.getRangeAt(0);
      if (!ref.current.contains(range.commonAncestorContainer)) return;
      savedRange.current = range.cloneRange();
      setInTable(Boolean(cellAt(range.startContainer, ref.current)));
    }
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, []);

  function restoreSelection() {
    ref.current?.focus();
    const range = savedRange.current;
    if (!range || !ref.current?.contains(range.commonAncestorContainer)) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function push() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function run(tool) {
    restoreSelection();
    document.execCommand(tool.cmd, false, tool.arg);
    push();
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
    restoreSelection();
    document.execCommand('createLink', false, url);
    push();
  }

  function insertTable(rows, cols, cells) {
    setPicker(null);
    restoreSelection();
    document.execCommand('insertHTML', false, tableHtml(rows, cols, cells));
    push();
  }

  /* ── Editing a table that already exists ──────────────────────────────── */

  function currentCell() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return cellAt(sel.getRangeAt(0).startContainer, ref.current);
  }

  function tableAction(fn) {
    restoreSelection();
    const cell = currentCell();
    if (!cell) return;
    fn(cell, cell.parentElement, cell.closest('table'));
    push();
  }

  const addRow = () =>
    tableAction((cell, row, table) => {
      const fresh = document.createElement('tr');
      fresh.innerHTML = Array.from(row.cells, () => blankCell('td')).join('');
      // A new row after the header belongs at the top of the body, not inside
      // the header — otherwise the website paints it as a second heading strip.
      if (row.parentElement.tagName === 'THEAD') {
        const body = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
        body.insertBefore(fresh, body.firstChild);
      } else {
        row.parentElement.insertBefore(fresh, row.nextSibling);
      }
      focusCell(fresh.cells[0]);
    });

  const addColumn = () =>
    tableAction((cell, row, table) => {
      const index = cell.cellIndex;
      Array.from(table.rows).forEach((r) => {
        const neighbour = r.cells[Math.min(index, r.cells.length - 1)];
        const fresh = document.createElement(neighbour ? neighbour.tagName : 'TD');
        fresh.innerHTML = '<br>';
        r.insertBefore(fresh, neighbour ? neighbour.nextSibling : null);
      });
      focusCell(row.cells[index + 1]);
    });

  const deleteRow = () =>
    tableAction((cell, row, table) => {
      if (table.rows.length <= 1) table.remove();
      else row.remove();
    });

  const deleteColumn = () =>
    tableAction((cell, row, table) => {
      if (row.cells.length <= 1) {
        table.remove();
        return;
      }
      const index = cell.cellIndex;
      Array.from(table.rows).forEach((r) => r.cells[index]?.remove());
    });

  const deleteTable = () =>
    tableAction((cell, row, table) => {
      table.remove();
      setInTable(false);
    });

  function focusCell(cell) {
    if (!cell) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange.current = range.cloneRange();
  }

  /* Tab is how everybody expects to move through a table, and adding a row at
     the end of it is how everybody expects a table to grow. */
  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    const cell = currentCell();
    if (!cell) return;
    e.preventDefault();

    const table = cell.closest('table');
    const cells = Array.from(table.querySelectorAll('th,td'));
    const next = cells[cells.indexOf(cell) + (e.shiftKey ? -1 : 1)];

    if (next) {
      focusCell(next);
      return;
    }
    if (e.shiftKey) return;
    addRow();
  }

  function onPaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // ...but not when the cursor is already in a table: pasting a block of
    // spreadsheet text into one cell should fill that cell, not nest a second
    // table inside it.
    const grid = currentCell() ? null : gridFromPastedText(text);
    if (grid) {
      document.execCommand('insertHTML', false, tableHtml(grid.rows.length, grid.cols, grid.rows));
      push();
      return;
    }

    // Otherwise paste as plain text, so copying from Word or WhatsApp doesn't
    // drag in fonts and colours that clash with the website's styling.
    document.execCommand('insertText', false, text);
    push();
  }

  const buttonClass =
    'rounded-lg px-2.5 py-1 text-xs text-ink-muted transition hover:bg-slate-200 hover:text-ink';

  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-sm font-bold text-ink">
        {label}
        <span className="ml-1 text-brand-red">*</span>
      </span>
      {hint && <p className="mb-1.5 text-xs leading-snug text-ink-muted">{hint}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-navy-light focus-within:ring-2 focus-within:ring-navy-light/25">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
          {TOOLS.map((tool, i) =>
            tool.sep ? (
              // eslint-disable-next-line react/no-array-index-key
              <span key={`sep-${i}`} aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-300" />
            ) : (
              <button
                key={tool.label}
                type="button"
                title={tool.title}
                onMouseDown={(e) => e.preventDefault()} // keep the text selection
                onClick={() => run(tool)}
                className={`${buttonClass} ${tool.className || 'font-bold'}`}
              >
                {tool.label}
              </button>
            )
          )}

          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-300" />

          <button
            type="button"
            title="Turn the highlighted words into a link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addLink}
            className={`${buttonClass} font-bold`}
          >
            🔗 Link
          </button>

          <TablePicker
            open={Boolean(picker)}
            hovered={picker}
            onOpen={() => setPicker({ rows: 0, cols: 0 })}
            onClose={() => setPicker(null)}
            onHover={setPicker}
            onPick={(rows, cols) => insertTable(rows, cols, null)}
            buttonClass={buttonClass}
          />

          <button
            type="button"
            title="Insert a dividing line"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run({ cmd: 'insertHorizontalRule' })}
            className={`${buttonClass} font-bold`}
          >
            — Divider
          </button>

          <button
            type="button"
            title="Remove bold, italics and links from the highlighted text"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              restoreSelection();
              document.execCommand('removeFormat');
              document.execCommand('unlink');
              push();
            }}
            className={`${buttonClass} font-bold`}
          >
            ✕ Clear
          </button>
        </div>

        {/* Table buttons only appear once the cursor is actually inside one, so
            the everyday toolbar stays short. */}
        {inTable && (
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-navy/5 px-1.5 py-1.5">
            <span className="px-1.5 text-xs font-bold text-navy">Table:</span>
            {[
              { label: '+ Row', title: 'Add a row below this one', onClick: addRow },
              { label: '+ Column', title: 'Add a column to the right', onClick: addColumn },
              { label: '− Row', title: 'Delete this row', onClick: deleteRow },
              { label: '− Column', title: 'Delete this column', onClick: deleteColumn },
              { label: '🗑 Delete table', title: 'Remove the whole table', onClick: deleteTable },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                title={b.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={b.onClick}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-navy shadow-sm transition hover:bg-navy hover:text-white"
              >
                {b.label}
              </button>
            ))}
            <span className="ml-auto px-1.5 text-xs text-ink-muted">
              Press Tab to move between cells — Tab in the last cell adds a row.
            </span>
          </div>
        )}

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          data-placeholder="Write the full article here…"
          onInput={(e) => onChange(e.currentTarget.innerHTML)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className="prose-bsjs min-h-52 max-w-none px-3.5 py-3 focus:outline-none"
        />
      </div>

      {error && <p className="mt-1.5 text-xs font-semibold text-brand-red">{error}</p>}
    </div>
  );
}

/**
 * The size grid every word processor uses: drag across the squares and the
 * table appears. Far less daunting than being asked for two numbers.
 */
function TablePicker({ open, hovered, onOpen, onClose, onHover, onPick, buttonClass }) {
  const rows = hovered?.rows || 0;
  const cols = hovered?.cols || 0;

  return (
    <span className="relative">
      <button
        type="button"
        title="Insert a table"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? onClose() : onOpen())}
        className={`${buttonClass} font-bold ${open ? 'bg-slate-200 text-ink' : ''}`}
      >
        ▦ Table
      </button>

      {open && (
        <>
          {/* Clicking anywhere else puts the picker away. */}
          <span
            className="fixed inset-0 z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
            }}
          />
          <div className="absolute top-full left-0 z-20 mt-1 rounded-xl border border-slate-300 bg-white p-2.5 shadow-lg">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1.1rem)` }}
              onMouseLeave={() => onHover({ rows: 0, cols: 0 })}
            >
              {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
                const r = Math.floor(i / MAX_COLS) + 1;
                const c = (i % MAX_COLS) + 1;
                const lit = r <= rows && c <= cols;
                return (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    aria-label={`${r} by ${c} table`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => onHover({ rows: r, cols: c })}
                    onClick={() => onPick(r, c)}
                    className={`h-[1.1rem] w-[1.1rem] rounded-[3px] border ${
                      lit ? 'border-navy bg-navy/25' : 'border-slate-300 bg-slate-50'
                    }`}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-center text-xs font-semibold text-ink-muted">
              {rows && cols ? `${cols} across × ${rows} down` : 'Choose a size'}
            </p>
            <p className="mt-1 max-w-44 text-center text-[0.68rem] leading-snug text-slate-400">
              The top row becomes the table's headings.
            </p>
          </div>
        </>
      )}
    </span>
  );
}
