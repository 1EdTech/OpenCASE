import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { FrameworkLabels } from './FrameworkLabels'

describe('FrameworkLabels', () => {
  it('renders nothing but the wrapper when no labels apply', () => {
    const { container } = render(<FrameworkLabels />)
    expect(container.firstElementChild).toBeEmptyDOMElement()
  })

  it.each([
    ['Draft', 'Draft'],
    ['Pending Implementation', 'Pending'],
    ['Implemented', 'Published'],
    ['Retired', 'Retired'],
    ['Adopted', 'Published'],
    ['Deprecated', 'Retired'],
  ])('shows adoption status %s as "%s"', (status, label) => {
    render(<FrameworkLabels adoptionStatus={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows an unrecognized adoption status as-is with the neutral badge', () => {
    render(<FrameworkLabels adoptionStatus="Derived" />)
    expect(screen.getByText('Derived')).toHaveClass('bg-gray-100', 'text-gray-600')
  })

  it('shows Read-only and Public only when set', () => {
    const { rerender } = render(<FrameworkLabels />)
    expect(screen.queryByText('Read-only')).not.toBeInTheDocument()
    expect(screen.queryByText('Public')).not.toBeInTheDocument()

    rerender(<FrameworkLabels readOnly publicAccess />)
    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.getByText('Public')).toHaveAttribute('title', 'Anyone can read this framework without signing in')
  })

  it('shows Mirrored for an unmodified import, with the source in the tooltip', () => {
    render(<FrameworkLabels isModifiedFromSource={false} sourcePackageURI="https://example.org/pkg" />)
    expect(screen.getByText('Mirrored')).toHaveAttribute('title', 'Mirrored from https://example.org/pkg')
  })

  it('shows Forked for a locally modified import', () => {
    render(<FrameworkLabels isModifiedFromSource />)
    expect(screen.getByText('Forked')).toHaveAttribute('title', 'Forked — originally mirrored, now locally modified')
  })

  it('shows no mirror badge for a framework that was never imported', () => {
    render(<FrameworkLabels adoptionStatus="Draft" />)
    expect(screen.queryByText('Mirrored')).not.toBeInTheDocument()
    expect(screen.queryByText('Forked')).not.toBeInTheDocument()
  })
})
