"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}

// A pop-up built on the browser's own <dialog> element (styled by DaisyUI).
export default function Modal({ open, onClose, title, wide, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open or close the <dialog> whenever `open` changes
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className={`modal-box ${wide ? "max-w-4xl" : ""}`}>
        <h3 className="mb-4 text-lg font-bold">{title}</h3>
        {/* Children only exist while open: a video stops playing and a form starts fresh */}
        {open ? children : null}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close">close</button>
      </form>
    </dialog>
  );
}
