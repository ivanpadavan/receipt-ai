import React, { useEffect } from "react";
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { useModalRef } from "@/components/ui/modal/ModalContext";

interface ModalProps {
  children: React.ReactNode;
}

export function Modal({ children }: ModalProps) {
  const { isOpen, hidingCompleted, hideModal } = useModalRef();
  const { transitionState, isVisible } = useModalAnimation(isOpen === 'hiding' ? false : isOpen);

  useEffect(() => {
    if (!isVisible) {
      hidingCompleted();
    }
  }, [isVisible, hidingCompleted]);

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <div
        className="fixed inset-0 bg-black"
        style={{ opacity: transitionState * .5 }}
        onClick={() => hideModal()}
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
