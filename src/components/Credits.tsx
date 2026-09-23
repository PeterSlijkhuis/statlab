import './Credits.css';

// Logo files are picked up from src/assets/logos by name, so adding
// utwente.svg or bmslab.png there is all it takes to swap a text wordmark for
// the real logo. Until a file is there, the partner's name stands in for it.
const LOGO_FILES = import.meta.glob<string>('../assets/logos/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function logoFor(key: string) {
  const path = Object.keys(LOGO_FILES).find((file) => file.split('/').pop()?.replace(/\.[^.]+$/, '') === key);
  return path ? LOGO_FILES[path] : undefined;
}

export const AUTHORS = ['dr. P.J.H. Slijkhuis', 'dr. V.d.C. Resendez Gomez'] as const;
export const SOURCE_MATERIALS_BY = 'dr. S.J. Watson';

export const PARTNERS = [
  { key: 'utwente', name: 'University of Twente', href: 'https://www.utwente.nl/en/' },
  { key: 'bmslab', name: 'The BMS Lab', href: 'https://bmslab.utwente.nl/' },
] as const;

type Props = {
  /** Compact sits at the foot of the sidebar; full closes the home page. */
  variant?: 'compact' | 'full';
};

export default function Credits({ variant = 'full' }: Props) {
  return (
    <footer className={`credits credits-${variant}`}>
      <p className="credits-authors">
        Made by {AUTHORS.join(' and ')}, based on materials provided by {SOURCE_MATERIALS_BY}.
      </p>
      <ul className="credits-partners">
        {PARTNERS.map((partner) => {
          const src = logoFor(partner.key);
          return (
            <li key={partner.key}>
              <a href={partner.href} target="_blank" rel="noopener noreferrer" className="credits-partner">
                {src ? <img src={src} alt={partner.name} /> : <span className="credits-wordmark">{partner.name}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
