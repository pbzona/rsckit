import { useEffect, useRef, useState } from "react";

export function SourceDialog({
  file,
  getSource,
  close,
}: {
  file: string;
  getSource: (file: string) => Promise<{ path: string; source: string }>;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    getSource(file)
      .then((result) => {
        if (active) setSource(result.source);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      active = false;
    };
  }, [file, getSource]);
  return (
    <dialog ref={dialog} onClose={close} aria-labelledby="source-title">
      <header className="dialog-header">
        <h2 id="source-title">{file}</h2>
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </header>
      {error ? (
        <p className="dialog-message" role="alert">
          {error}
        </p>
      ) : source === null ? (
        <p className="dialog-message">Loading source…</p>
      ) : (
        <pre className="source-code">
          <code>{source}</code>
        </pre>
      )}
    </dialog>
  );
}
