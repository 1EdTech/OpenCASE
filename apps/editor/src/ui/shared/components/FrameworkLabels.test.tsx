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
    ['Pending Implementation', 'Pending Implementation'],
    ['Implemented', 'Implemented'],
    ['Retired', 'Retired'],
    ['Adopted', 'Adopted'],
    ['Deprecated', 'Deprecated'],
  ])('shows adoption status %s as "%s"', (status, label) => {
    render(<FrameworkLabels adoptionStatus={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('no longer relabels Implemented as "Published"', () => {
    render(<FrameworkLabels adoptionStatus="Implemented" />)
    expect(screen.queryByText('Published')).not.toBeInTheDocument()
  })

  it('colors a legacy adoption status like its modern equivalent', () => {
    render(<FrameworkLabels adoptionStatus="Adopted" />)
    expect(screen.getByText('Adopted')).toHaveClass('bg-emerald-100', 'text-emerald-800')
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

  it.each([false, true, undefined])('does not show import status when isModifiedFromSource is %s', (isModifiedFromSource) => {
    const provenance = { isModifiedFromSource, sourcePackageURI: 'https://example.org/pkg' }
    const { container } = render(<FrameworkLabels {...provenance} adoptionStatus="Draft" readOnly publicAccess />)

    expect(screen.queryByText('Mirrored')).not.toBeInTheDocument()
    expect(screen.queryByText('Forked')).not.toBeInTheDocument()
    expect(screen.queryByTitle(/mirrored|forked/i)).not.toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
  })
})
