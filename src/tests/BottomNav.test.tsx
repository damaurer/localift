// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BottomNav from '../components/BottomNav.tsx';
import { TestWrapper, createTestWrapper } from '../test-utils.tsx';

describe('BottomNav', () => {
  it('renders navigation links', () => {
    render(<BottomNav />, { wrapper: TestWrapper });
    expect(screen.getByLabelText('Home')).toBeDefined();
    expect(screen.getByLabelText('Pläne')).toBeDefined();
    expect(screen.getByLabelText('Kalorien')).toBeDefined();
    expect(screen.getByLabelText('Einstellungen')).toBeDefined();
  });

  it('marks dashboard as active on root path', () => {
    render(<BottomNav />, { wrapper: createTestWrapper('/') });
    const homeLink = screen.getByLabelText('Home');
    expect(homeLink.getAttribute('aria-current')).toBe('page');
  });

  it('marks plans as active on /plans path', () => {
    render(<BottomNav />, { wrapper: createTestWrapper('/plans') });
    const plansLink = screen.getByLabelText('Pläne');
    expect(plansLink.getAttribute('aria-current')).toBe('page');
  });

  it('renders material icons', () => {
    render(<BottomNav />, { wrapper: TestWrapper });
    expect(screen.getByText('grid_view')).toBeDefined();
    expect(screen.getByText('event_note')).toBeDefined();
    expect(screen.getByText('restaurant')).toBeDefined();
    expect(screen.getByText('settings')).toBeDefined();
  });
});
