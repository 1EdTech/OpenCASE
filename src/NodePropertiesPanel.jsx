import { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';

export default function NodePropertiesPanel({ node, onClose, onChangeNode }) {
  useEffect(() => {
    if (!node) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [node, onClose]);

  const rows = useMemo(() => {
    if (!node) return [];
    return [
      ['id', node.id],
      ['type', node.type ?? 'default'],
      ['parentId', node.data?.parentId ?? '—'],
    ];
  }, [node]);

  const isOpen = Boolean(node);

  return (
    <aside
      className={[
        'fixed right-0 top-0 z-20 flex h-screen w-[min(420px,92vw)] flex-col border-l border-black/10 bg-white text-slate-900 shadow-[-16px_0_40px_rgba(0,0,0,0.22)] transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
      aria-label="Node properties"
    >
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <div className="font-bold">Properties</div>
          <Button variant="secondary" size="xs" onClick={() => onClose?.()}>
            Close
          </Button>
        </div>

        {node ? (
          <div className="flex-1 overflow-auto p-4">
          <div className="mb-3 rounded-xl border border-black/10 bg-slate-900/2 p-3">
              {rows.map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[90px_1fr] gap-2 border-b border-black/5 py-1 last:border-b-0"
                >
                  <div className="text-xs text-slate-600">{k}</div>
                <div className="wrap-break-word font-mono text-xs text-slate-900">{String(v)}</div>
                </div>
              ))}
            </div>

          <div className="rounded-xl border border-black/10 bg-slate-900/2 p-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="node-label">
                Label
              </label>
              <input
                id="node-label"
              className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-700/40 focus-visible:outline-offset-2"
                value={node.data?.label ?? ''}
                onChange={(e) => {
                  const next = e.target.value;
                  onChangeNode?.(node.id, { label: next });
                }}
              />
            </div>
          </div>
        ) : null}
    </aside>
  );
}

NodePropertiesPanel.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    data: PropTypes.shape({
      label: PropTypes.string,
      parentId: PropTypes.string,
    }),
  }),
  onClose: PropTypes.func,
  onChangeNode: PropTypes.func,
};
