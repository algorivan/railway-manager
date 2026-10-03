import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
/** Only the list scrolls; menu navigation and actions remain outside it. */
export function ScrollList<T>({
  items,
  render,
}: {
  items: readonly T[];
  render: (item: T, index: number) => ReactNode;
}) {
  return (
    <div className="scroll-list detail-scroll" tabIndex={0}>
      {items.map(render)}
    </div>
  );
}
export function CompactWorkspace({ children }: { children: ReactNode }) {
  const sections = Children.toArray(children).filter(isValidElement);
  const [tab, setTab] = useState(0);
  return (
    <div className="compact-workspace">
      <div className="workspace-tabs" role="tablist">
        {sections.map((child, i) => (
          <button
            role="tab"
            aria-selected={tab === i}
            key={i}
            onClick={() => setTab(i)}
          >
            {(child.props as { title?: string }).title ?? `Bagian ${i + 1}`}
          </button>
        ))}
      </div>
      {sections.map((child, i) => (
        <div role="tabpanel" hidden={tab !== i} key={i}>
          {child}
        </div>
      ))}
    </div>
  );
}
export function ManagementDialog({
  title,
  children,
  close,
  dirty,
  discard,
  returnToMissions,
  interactiveMap = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  dirty: boolean;
  discard: () => void;
  returnToMissions?: () => void;
  interactiveMap?: boolean;
}) {
  const element = useRef<HTMLElement>(null),
    [confirm, setConfirm] = useState(false);
  const requestClose = () => (dirty ? setConfirm(true) : close());
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null;
    element.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab" || interactiveMap) return;
      const nodes = [
        ...element.current!.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, summary, [tabindex="0"]',
        ),
      ].filter(
        (node) =>
          !node.hasAttribute("disabled") && node.getClientRects().length > 0,
      );
      if (!nodes.length) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === nodes[0] ||
          document.activeElement === element.current)
      ) {
        event.preventDefault();
        nodes.at(-1)!.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === nodes.at(-1) ||
          document.activeElement === element.current)
      ) {
        event.preventDefault();
        nodes[0]!.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, [interactiveMap]);
  return (
    <div
      className={`management-backdrop ${interactiveMap ? "map-picking" : ""}`}
    >
      <section
        ref={element}
        tabIndex={-1}
        role="dialog"
        aria-modal={!interactiveMap}
        aria-label={title}
        className="management-dialog"
      >
        <header className="dialog-heading">
          <div>
            <small>PENGELOLAAN PERUSAHAAN</small>
            <h1>{title}</h1>
          </div>
          {returnToMissions && (
            <button className="tutorial-return" onClick={returnToMissions}>
              ← Kembali ke misi
            </button>
          )}
          <span className={dirty ? "draft-status dirty" : "draft-status"}>
            {dirty
              ? "Perubahan belum disimpan"
              : "Perusahaan tersimpan di browser"}
          </span>
          <button aria-label={`Tutup ${title}`} onClick={requestClose}>
            ✕
          </button>
        </header>
        {confirm && (
          <div className="discard-draft" role="alert">
            <span>Perubahan di Jadwal belum disimpan.</span>
            <button onClick={() => setConfirm(false)}>
              Kembali ke rancangan
            </button>
            <button
              onClick={() => {
                discard();
                close();
              }}
            >
              Tutup tanpa menyimpan
            </button>
          </div>
        )}
        <div className="dialog-body">{children}</div>
      </section>
    </div>
  );
}

/** Use the available panel width, preserving forms when panes are switched. */
export function ResponsiveColumns({
  children,
  labels,
}: {
  children: ReactNode;
  labels?: string[];
}) {
  const panes = Children.toArray(children),
    [selected, setSelected] = useState(0),
    [mobile, setMobile] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0)
        setMobile(entry.contentRect.width < 640);
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={container}
      className={`responsive-columns ${mobile ? "single-pane" : ""}`}
    >
      {mobile && (
        <div className="mobile-pane-tabs" role="tablist">
          {panes.map((p, i) => (
            <button
              role="tab"
              aria-selected={selected === i}
              key={i}
              onClick={() => setSelected(i)}
            >
              {labels?.[i] ??
                (isValidElement(p)
                  ? (p.props as { title?: string }).title
                  : undefined) ??
                (i === 0 ? "Pengaturan" : "Rincian")}
            </button>
          ))}
        </div>
      )}
      <div className="two-column">
        {panes.map((p, i) => (
          <div
            className="responsive-pane"
            hidden={mobile && selected !== i}
            key={i}
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
