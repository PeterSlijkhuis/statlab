import './Primer.css';

/** A folder layout as text. `tree` is written with line-drawing characters in the lesson. */
export default function FolderTree({ tree, label }: { tree: string; label: string }) {
  return (
    <pre className="folder-tree" aria-label={label}>
      {tree.replace(/^\n+|\n+$/g, '')}
    </pre>
  );
}
