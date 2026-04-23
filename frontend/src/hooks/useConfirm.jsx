import { useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    message: '',
    resolve: null
  });

  const confirm = (message) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        resolve
      });
    });
  };

  const handleConfirm = () => {
    if (confirmState.resolve) confirmState.resolve(true);
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  const handleCancel = () => {
    if (confirmState.resolve) confirmState.resolve(false);
    setConfirmState({ isOpen: false, message: '', resolve: null });
  };

  const ConfirmDialog = () => (
    <ConfirmModal 
      isOpen={confirmState.isOpen} 
      message={confirmState.message} 
      onConfirm={handleConfirm} 
      onCancel={handleCancel} 
    />
  );

  return { confirm, ConfirmDialog };
}
