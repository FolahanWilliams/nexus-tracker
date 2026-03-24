'use client';

import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' shows red styling, 'primary' shows purple. Default 'danger'. */
  variant?: 'danger' | 'primary';
}

/**
 * Reusable confirmation dialog for destructive or important actions.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm" showClose={false}>
      <div className="text-center">
        <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
          variant === 'danger' ? 'bg-[var(--color-red)]/15' : 'bg-[var(--color-purple)]/15'
        }`}>
          <AlertTriangle size={24} className={variant === 'danger' ? 'text-[var(--color-red)]' : 'text-[var(--color-purple)]'} />
        </div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        {description && <p className="text-sm text-[var(--color-text-secondary)] mb-6">{description}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="rpg-button flex-1">
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`rpg-button flex-1 ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
