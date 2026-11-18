import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AppIcon } from './Icon';

type Prompt = { title: string; message: string; action: string; destructive?: boolean };
type PendingPrompt = Prompt & { resolve: (accepted: boolean) => void };

const ConfirmContext = createContext<(prompt: Prompt) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [prompt, showPrompt] = useState<PendingPrompt>();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  function finish(accepted: boolean) {
    dialog.current?.close();
    trigger.current?.focus();
    showPrompt(undefined);
    prompt?.resolve(accepted);
  }

  useLayoutEffect(() => {
    if (!prompt) return;
    dialog.current?.showModal();
    cancelButton.current?.focus();
  }, [prompt]);

  return <ConfirmContext.Provider value={(request) => new Promise((resolve) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    showPrompt({ ...request, resolve });
  })}>
    {children}
    {prompt && <dialog ref={dialog} className="confirm" aria-labelledby="confirm-title" aria-describedby="confirm-message"
      onCancel={(event) => { event.preventDefault(); finish(false); }}>
      <AppIcon name="warning" size={28} />
      <h2 id="confirm-title">{prompt.title}</h2>
      <p id="confirm-message">{prompt.message}</p>
      <div className="dialog-actions">
        <button ref={cancelButton} onClick={() => finish(false)}>Cancel</button>
        <button className={prompt.destructive ? 'danger' : 'primary'} onClick={() => finish(true)}>{prompt.action}</button>
      </div>
    </dialog>}
  </ConfirmContext.Provider>;
}
