import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import TestChooser from './TestChooser';

function renderChooser() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TestChooser />
    </MemoryRouter>,
  );
}

describe('TestChooser', () => {
  test('starts by asking about the outcome variable', () => {
    renderChooser();
    expect(screen.getByText(/what kind of outcome/i)).toBeDefined();
  });

  test('walking the numeric branch reaches a named test', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a number/i }));
    await userEvent.click(screen.getByRole('button', { name: /two groups/i }));
    await userEvent.click(screen.getByRole('button', { name: /different people/i }));
    expect(screen.getByText(/independent-samples t-test/i)).toBeDefined();
  });

  test('the categorical branch reaches the chi-square test', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a category/i }));
    await userEvent.click(screen.getByRole('button', { name: /two variables/i }));
    expect(screen.getByText(/chi-square test of independence/i)).toBeDefined();
  });

  test('can be restarted', async () => {
    renderChooser();
    await userEvent.click(screen.getByRole('button', { name: /a category/i }));
    await userEvent.click(screen.getByRole('button', { name: /start over/i }));
    expect(screen.getByText(/what kind of outcome/i)).toBeDefined();
  });
});
