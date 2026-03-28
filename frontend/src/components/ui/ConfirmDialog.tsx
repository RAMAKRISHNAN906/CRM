import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', isLoading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
