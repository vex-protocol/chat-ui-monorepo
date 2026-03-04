"use client";
import * as React from "react";

export interface ModalProps {
  isOpen?: boolean;
  title?: string;
  className?: string;
  onClose?: () => void;
  children?: any;
}

function Modal(props: ModalProps) {
  props = { isOpen: false, title: "", className: "", ...props };
  return (
    <>
      {props.isOpen ? (
        <>
          <div
            className="modal-backdrop"
            onClick={(event) => props.onClose?.()}
          >
            <div
              className={`modal ${props.className}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal__header">
                <span className="modal__title">{props.title}</span>
                <button
                  className="modal__close"
                  type="button"
                  aria-label="Close"
                  onClick={(event) => props.onClose?.()}
                >
                  ✕
                </button>
              </div>
              <div className="modal__body">{props.children}</div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default Modal;
