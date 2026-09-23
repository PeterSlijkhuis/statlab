import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, type Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { r } from '@codemirror/legacy-modes/mode/r';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Read once, at mount: the playground adds its Run shortcuts here. */
  extensions?: Extension[];
  /** Hands the editor to a parent that needs its selection or cursor. */
  viewRef?: { current: EditorView | null };
  label?: string;
};

export default function REditor({ value, onChange, extensions = [], viewRef, label }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!host.current) return;

    const editor = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          ...extensions,
          basicSetup,
          StreamLanguage.define(r),
          // Long lines wrap instead of scrolling sideways. On a phone a
          // horizontal scroller inside a vertically scrolling page is hard to
          // work, and a wrapped line keeps its single line number.
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
          ...(label ? [EditorView.contentAttributes.of({ 'aria-label': label })] : []),
        ],
      }),
      parent: host.current,
    });
    view.current = editor;
    if (viewRef) viewRef.current = editor;

    return () => {
      editor.destroy();
      view.current = null;
      if (viewRef) viewRef.current = null;
    };
    // Mount once: doc updates are pushed in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current === value) return;
    editor.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={host} className="r-editor" />;
}
