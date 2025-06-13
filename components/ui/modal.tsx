import React, { useRef } from 'react';
import { useModalAnimation } from '@/hooks/useModalAnimation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const { translateY, isVisible } = useModalAnimation(isOpen);

  if (!isVisible) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div
        className="bg-white rounded-t-xl shadow-xl w-full max-h-[90vh] overflow-auto"
        style={{
          transform: `translateY(${translateY * 100}%)`,
        }}
      >
        <div className="w-full py-1 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <div className="p-4">
          {children}
        </div>
        <div className="p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
