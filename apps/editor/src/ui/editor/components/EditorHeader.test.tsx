import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import EditorHeader from './EditorHeader'

describe('EditorHeader', () => {
  it('shows the framework labels beside the title', () => {
    render(
      <EditorHeader
        frameworkTitle="Skills-First Product Managers Skill Taxonomy"
        frameworkSubtitle="Competency"
        frameworkLabels={{ adoptionStatus: 'Derived', publicAccess: true }}
      />,
    )
    expect(screen.getByText('Skills-First Product Managers Skill Taxonomy')).toBeInTheDocument()
    expect(screen.getByText('Competency')).toBeInTheDocument()
    expect(screen.getByText('Derived')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.queryByText('Mirrored')).not.toBeInTheDocument()
    expect(screen.queryByText('Forked')).not.toBeInTheDocument()
  })

  it('shows no labels when none are given', () => {
    render(<EditorHeader frameworkTitle="Untitled" />)
    expect(screen.queryByText('Mirrored')).not.toBeInTheDocument()
    expect(screen.queryByText('Public')).not.toBeInTheDocument()
  })
})
