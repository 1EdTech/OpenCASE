import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import CanvasHeader from './CanvasHeader'

describe('CanvasHeader', () => {
  it('shows the framework labels beside the title', () => {
    render(
      <CanvasHeader
        frameworkTitle="Skills-First Product Managers Skill Taxonomy"
        frameworkSubtitle="Competency"
        frameworkLabels={{ adoptionStatus: 'Derived', publicAccess: true, isModifiedFromSource: false }}
      />,
    )
    expect(screen.getByText('Skills-First Product Managers Skill Taxonomy')).toBeInTheDocument()
    expect(screen.getByText('Competency')).toBeInTheDocument()
    expect(screen.getByText('Derived')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByText('Mirrored')).toBeInTheDocument()
  })

  it('shows no labels when none are given', () => {
    render(<CanvasHeader frameworkTitle="Untitled" />)
    expect(screen.queryByText('Mirrored')).not.toBeInTheDocument()
    expect(screen.queryByText('Public')).not.toBeInTheDocument()
  })
})
