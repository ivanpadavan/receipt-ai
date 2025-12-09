import React, { createContext, useState, useContext, useCallback, startTransition, useRef, useEffect } from "react";
import { Modal } from '@/components/ui/modal/modal';

export interface ModalRefContext {
  id: string;
  hidingCompleted: () => void;
  hideModal: (immediately?: boolean) => void;
  isOpen: boolean | 'hiding';
}

interface ModalContext {
  showModal: (content?: React.ReactNode, id?: string) => ModalRefContext | null;
  openedModals: ModalRefContext[];
}

export const ModalContext = createContext<ModalContext | null>(null);
export const ModalRefContext = createContext<ModalRefContext | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const useModalRef = () => {
  const context = useContext(ModalRefContext);
  if (!context) {
    throw new Error('useModalRef must be used within a ModalRefProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refContexts, setRefContexts] = useState<Array<ModalRefContext & { content: React.ReactNode }>>([]);
  const pendingUpdates = useRef(new Set<string>());

  const showModal = useCallback((content?: React.ReactNode, id?: string) => {
    if (pendingUpdates.current.has(id || '')) {
      return null;
    }
    const ourCtxIdx = refContexts.findIndex(ctx => ctx.id === id);
    if (content === undefined && !!id && ourCtxIdx !== -1) {
      pendingUpdates.current.add(id);
      queueMicrotask(() => setRefContexts(refContexts => {
        pendingUpdates.current.delete(id);
        return refContexts.splice(ourCtxIdx, 1);
      }));
      return null;
    }
    if (content === undefined || id === undefined) {
      return null;
    }
    const curIdx = refContexts.findIndex((ref) => ref.id === id);
    if (curIdx !== -1) {
      return refContexts[curIdx];
    }

    const ctrl = {
      id,
      content,
      isOpen: true,
      hideModal: (immediately = false) => setRefContexts((refContexts) => {
        const ourCtx = refContexts.find(ctx => ctx.id === id);
        if (ourCtx) {
          ourCtx.isOpen = immediately ? false : 'hiding';
          return [...refContexts];
        }
        return refContexts;
      }),
      hidingCompleted: () => {
        const ourCtxIdx = refContexts.findIndex(ctx => ctx.id === id);
        const ourCtx = refContexts.find(ctx => ctx.id === id);
        if (ourCtx) {
          ourCtx.isOpen = false;
          setRefContexts((refContexts) => refContexts.splice(ourCtxIdx, 1));
        }
      },
    };

    pendingUpdates.current.add(id);
    queueMicrotask(() => setRefContexts(refContexts => {
      refContexts.push(ctrl);
      pendingUpdates.current.delete(id);
      return [...refContexts];
    }));

    return null;
  }, [refContexts]);

  return (
    <ModalContext.Provider value={{ showModal, openedModals: refContexts }}>
      {children}
      {refContexts.map((ctx) => (
        <ModalRefContext.Provider key={ctx.id} value={ctx}>
          <Modal>
            {ctx.content}
          </Modal>
        </ModalRefContext.Provider>
      ))}
    </ModalContext.Provider>
  );
};
