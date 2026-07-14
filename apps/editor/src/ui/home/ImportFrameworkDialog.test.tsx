import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportFrameworkDialog, { type ImportResult } from './ImportFrameworkDialog'

const importResult: ImportResult = { status: 'imported', id: 'doc-1', version: 1 }

describe('ImportFrameworkDialog', () => {
  it('imports from a URL by default', async () => {
    const onImport = vi.fn().mockResolvedValue(importResult)
    const onImportJson = vi.fn()

    render(
      <ImportFrameworkDialog open onCancel={vi.fn()} onImport={onImport} onImportJson={onImportJson} />,
    )

    fireEvent.change(screen.getByLabelText('Framework URL'), {
      target: { value: 'https://case.example.org/ims/case/v1p1/CFPackages/doc-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import framework/i }))

    await waitFor(() => expect(onImport).toHaveBeenCalledWith(
      'https://case.example.org/ims/case/v1p1/CFPackages/doc-1',
      undefined,
    ))
    expect(onImportJson).not.toHaveBeenCalled()
  })

  it('switches to Paste JSON mode and imports a parsed CFPackage', async () => {
    const onImport = vi.fn()
    const onImportJson = vi.fn().mockResolvedValue(importResult)

    render(
      <ImportFrameworkDialog open onCancel={vi.fn()} onImport={onImport} onImportJson={onImportJson} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }))

    const cfPackage = { CFDocument: { identifier: 'doc-1' } }
    fireEvent.change(screen.getByLabelText('Framework JSON'), {
      target: { value: JSON.stringify(cfPackage) },
    })
    fireEvent.click(screen.getByRole('button', { name: /import framework/i }))

    await waitFor(() => expect(onImportJson).toHaveBeenCalledWith(cfPackage))
    expect(onImport).not.toHaveBeenCalled()
  })

  it('shows an inline error for malformed JSON without calling onImportJson', async () => {
    const onImport = vi.fn()
    const onImportJson = vi.fn()

    render(
      <ImportFrameworkDialog open onCancel={vi.fn()} onImport={onImport} onImportJson={onImportJson} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }))
    fireEvent.change(screen.getByLabelText('Framework JSON'), {
      target: { value: '{ not valid json' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import framework/i }))

    expect(await screen.findByText(/doesn.t look like valid json/i)).toBeInTheDocument()
    expect(onImportJson).not.toHaveBeenCalled()
    expect(onImport).not.toHaveBeenCalled()
  })

  it('surfaces validation warnings returned from a successful import', async () => {
    const onImport = vi.fn()
    const onImportJson = vi.fn().mockResolvedValue({
      ...importResult,
      validationWarnings: ['CFDocument.title is required'],
    })

    render(
      <ImportFrameworkDialog open onCancel={vi.fn()} onImport={onImport} onImportJson={onImportJson} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }))
    fireEvent.change(screen.getByLabelText('Framework JSON'), {
      target: { value: '{ "CFDocument": { "identifier": "doc-1" } }' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import framework/i }))

    expect(await screen.findByText('CFDocument.title is required')).toBeInTheDocument()
  })

  it('surfaces a thrown error from onImportJson', async () => {
    const onImport = vi.fn()
    const onImportJson = vi.fn().mockRejectedValue(new Error('import_failed: Schema validation failed'))

    render(
      <ImportFrameworkDialog open onCancel={vi.fn()} onImport={onImport} onImportJson={onImportJson} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }))
    fireEvent.change(screen.getByLabelText('Framework JSON'), {
      target: { value: '{ "CFDocument": { "identifier": "doc-1" } }' },
    })
    fireEvent.click(screen.getByRole('button', { name: /import framework/i }))

    expect(await screen.findByText('import_failed: Schema validation failed')).toBeInTheDocument()
  })
})
