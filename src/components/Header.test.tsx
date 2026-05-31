// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header, { LogoMark } from './Header.tsx';
import { TestWrapper } from '../test-utils.tsx';

describe('LogoMark', () => {
  it('renders the logo image and text', () => {
    render(<LogoMark />);
    expect(screen.getByAltText('LOCALlift')).toBeDefined();
    expect(screen.getByText('LOCAL')).toBeDefined();
    expect(screen.getByText('lift.')).toBeDefined();
  });
});

describe('Header', () => {
  it('renders logo when no title or showBack', () => {
    render(<Header />, { wrapper: TestWrapper });
    expect(screen.getByAltText('LOCALlift')).toBeDefined();
  });

  it('renders title when provided', () => {
    render(<Header title="Test Title" />, { wrapper: TestWrapper });
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('renders subtitle when provided', () => {
    render(<Header title="Title" subtitle="Sub" />, { wrapper: TestWrapper });
    expect(screen.getByText('Sub')).toBeDefined();
  });

  it('renders back button when showBack is true', () => {
    render(<Header showBack title="Back" />, { wrapper: TestWrapper });
    expect(screen.getByText('arrow_back')).toBeDefined();
  });

  it('does not render back button by default', () => {
    render(<Header title="No Back" />, { wrapper: TestWrapper });
    expect(screen.queryByText('arrow_back')).toBeNull();
  });

  it('renders rightContent when provided', () => {
    render(<Header title="T" rightContent={<span data-testid="right">R</span>} />, { wrapper: TestWrapper });
    expect(screen.getByTestId('right')).toBeDefined();
  });
});
