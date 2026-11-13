export type ToastState = { type: "success" | "error"; message: string } | null;

// A small message in the corner of the screen
export default function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div className="toast toast-end z-50" role="status">
      <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-error"}`}>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
