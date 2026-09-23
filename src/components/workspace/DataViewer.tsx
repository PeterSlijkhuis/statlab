import type { DataPreview } from '../../r/workspace';

/** RStudio's data viewer, opened by `View(df)` or by clicking a data frame in Environment. */
export default function DataViewer({ name, data }: { name: string; data: DataPreview | null | undefined }) {
  if (data === undefined) return <p className="ide-empty">Opening {name}…</p>;
  if (data === null) return <p className="ide-empty">‘{name}’ is not a data frame, or no longer exists.</p>;
  return (
    <>
      <div className="ide-toolbar">
        <span className="ide-toolbar-label">
          {data.shown < data.rows
            ? `Showing the first ${data.shown} of ${data.rows} rows, ${data.columns.length} columns`
            : `${data.rows} rows, ${data.columns.length} columns`}
        </span>
      </div>
      <div className="ide-scroll ide-scroll-both">
        <table className="ide-data" aria-label={`Data in ${name}`}>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Row</span></th>
              {data.columns.map((column, index) => (
                <th key={index} scope="col">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cells.map((row, index) => (
              <tr key={index}>
                <th scope="row">{index + 1}</th>
                {row.map((cell, col) => (
                  <td key={col} className={cell === 'NA' ? 'ide-na' : undefined}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
