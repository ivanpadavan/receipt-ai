import React from 'react';
import { useModalAnimation } from '@/hooks/useModalAnimation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const { transitionState, isVisible } = useModalAnimation(isOpen);

  if (!isVisible) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <div
        className="fixed inset-0 bg-black"
        style={{ opacity: transitionState * .5 }}
        onClick={onClose}
      />
      <div
        className="bg-white rounded-t-xl shadow-xl w-full max-h-[90vh] overflow-auto"
        style={{
          transform: `translateY(${(-transitionState + 1) * 100}%)`,
        }}
      >
        <div className="w-full py-1 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};
