import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ children }: { children: ReactNode }) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return <>{children}</>;
  return createPortal(children, modalRoot);
}
