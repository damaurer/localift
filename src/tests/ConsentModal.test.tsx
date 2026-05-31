// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentModal from '../components/ConsentModal.tsx';
import { TestWrapper } from '../test-utils.tsx';

vi.mock('../data/storage', () => ({
  storage: {
    getConsent: vi.fn().mockReturnValue(null),
    saveConsent: vi.fn(),
  },
  needsConsent: vi.fn().mockReturnValue(true),
}));

describe('ConsentModal', () => {
  it('renders in info-only mode when onClose is provided', () => {
    const onClose = vi.fn();
    render(<ConsentModal onClose={onClose} />, { wrapper: TestWrapper });
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('calls onClose when close button clicked in info mode', () => {
    const onClose = vi.fn();
    render(<ConsentModal onClose={onClose} />, { wrapper: TestWrapper });
    // Find close buttons (there are two - X button and bottom button)
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders consent gate mode when no onClose', () => {
    render(<ConsentModal />, { wrapper: TestWrapper });
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('checkbox')).toBeDefined();
  });

  it('disables accept button when checkbox not checked', () => {
    render(<ConsentModal />, { wrapper: TestWrapper });
    const buttons = screen.getAllByRole('button');
    // The accept button should be disabled
    const acceptBtn = buttons[buttons.length - 1];
    expect(acceptBtn.hasAttribute('disabled')).toBe(true);
  });

  it('enables accept button when checkbox is checked', () => {
    render(<ConsentModal />, { wrapper: TestWrapper });
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const buttons = screen.getAllByRole('button');
    const acceptBtn = buttons[buttons.length - 1];
    expect(acceptBtn.hasAttribute('disabled')).toBe(false);
  });

  it('renders info items', () => {
    render(<ConsentModal onClose={vi.fn()} />, { wrapper: TestWrapper });
    // Should render the info list items
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBe(4);
  });
});
