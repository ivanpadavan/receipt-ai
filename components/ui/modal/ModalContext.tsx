import React, { createContext, useState, useContext } from 'react';
import { Modal } from '@/components/ui/modal/modal';

interface ModalContextType {
  showModal: (content: React.ReactNode) => void;
  hideModal: () => void;
}

export const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<React.ReactNode>(null);

  const showModal = (content: React.ReactNode) => {
    setContent(content);
    setIsOpen(true);
  };

  const hideModal = () => {
    setIsOpen(false);
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <Modal isOpen={isOpen} onClose={hideModal}>
        {content}
      </Modal>
    </ModalContext.Provider>
  );
};
