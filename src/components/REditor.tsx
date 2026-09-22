import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { r } from '@codemirror/legacy-modes/mode/r';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function REditor({ value, onChange }: Props) {
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
          basicSetup,
          StreamLanguage.define(r),
          // Long lines wrap instead of scrolling sideways. On a phone a
          // horizontal scroller inside a vertically scrolling page is hard to
          // work, and a wrapped line keeps its single line number.
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: host.current,
    });
    view.current = editor;

    return () => {
      editor.destroy();
      view.current = null;
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
