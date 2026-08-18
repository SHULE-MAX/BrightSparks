import Modal from './Modal.jsx';
import { Button } from './Field.jsx';

/**
 * Deleting is the one action here that cannot be undone, so it always names
 * the exact item being removed rather than asking "Are you sure?".
 */
export default function ConfirmDialog({
  open,
  itemName,
  what = 'item',
  busy,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      title={`Delete this ${what}?`}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Keep it
          </Button>
          <Button variant="danger" onClick={onConfirm} busy={busy}>
            Yes, delete
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink">
        <strong className="font-bold">{itemName}</strong> will be permanently removed from the
        website. This cannot be undone.
      </p>
      <p className="mt-3 rounded-xl bg-gold-light/20 px-4 py-3 text-sm leading-relaxed text-ink">
        If you only want to take it off the website for now, close this box and switch it to{' '}
        <strong className="font-bold">Hidden</strong> instead — you can bring it back at any time.
      </p>
    </Modal>
  );
}
