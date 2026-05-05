"use client";
import * as React from "react";

export interface ModalProps {
    children?: any;
    className?: string;
    isOpen?: boolean;
    onClose?: () => void;
    title?: string;
}

function Modal(props: ModalProps) {
    props = { className: "", isOpen: false, title: "", ...props };
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
                                <span className="modal__title">
                                    {props.title}
                                </span>
                                <button
                                    aria-label="Close"
                                    className="modal__close"
                                    type="button"
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
