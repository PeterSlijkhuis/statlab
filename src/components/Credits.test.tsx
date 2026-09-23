import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import Credits from './Credits';
import Sidebar from './Sidebar';

describe('Credits', () => {
  test('names the authors and the source of the materials', () => {
    render(<Credits />);
    expect(screen.getByText(
      'Made by dr. P.J.H. Slijkhuis and dr. V.d.C. Resendez Gomez, based on materials provided by dr. S.J. Watson.',
    )).toBeTruthy();
  });

  test('links to both partners, each opening in a new tab', () => {
    render(<Credits />);
    const twente = screen.getByRole('link', { name: 'University of Twente' });
    const lab = screen.getByRole('link', { name: 'The BMS Lab' });
    for (const link of [twente, lab]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(twente.getAttribute('href')).toBe('https://www.utwente.nl/en/');
  });

  // The home page is not the only way in: a student following a shared lesson
  // link never sees it, so the credit has to be on every page.
  test('shows at the foot of the sidebar, which every page has', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Course navigation' });
    expect(within(nav).getByText(/Made by dr\. P\.J\.H\. Slijkhuis/)).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'The BMS Lab' })).toBeTruthy();
  });
});
