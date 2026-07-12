export default function Modal({ open, title, body, onClose, children }) {
  return (
    <div
      className={`modal-overlay${open ? ' open' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal">
        {title && <p className="modal-title">{title}</p>}
        {body && <p className="modal-body">{body}</p>}
        {children}
      </div>
    </div>
  );
}
