// Za vsake unread message se pokaze stevilka na ikoni za chat v navigationu.
type Listener = () => void;

const listeners = new Set<Listener>();

export const chatUnreadBus = {
  emit() {
    for (const l of listeners) l();
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
