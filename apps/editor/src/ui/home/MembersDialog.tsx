import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shared/components/ui/dialog'
import { Input } from '@/ui/shared/components/ui/input'
import { Label } from '@/ui/shared/components/ui/label'
import { TrashIcon, PlusIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { CaseApiClient, TenantMember, TenantMemberRole } from '@/infrastructure/caseApi/CaseApiClient'

const ROLE_OPTIONS: { value: TenantMemberRole; label: string; hint: string }[] = [
  { value: 'viewer', label: 'Viewer', hint: 'Read frameworks' },
  { value: 'author', label: 'Author', hint: 'Create and edit frameworks' },
  { value: 'admin', label: 'Admin', hint: 'Manage members, API keys, and CGE credentials' },
]

function roleLabel (role: TenantMemberRole | null): string {
  if (!role) return '—'
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1 inline-flex shrink-0 items-center rounded p-1 text-gray-400 hover:text-gray-600"
      title="Copy to clipboard"
    >
      {copied
        ? <CheckIcon className="h-4 w-4 text-green-500" />
        : <ClipboardDocumentIcon className="h-4 w-4" />}
    </button>
  )
}

export default function MembersDialog({
  open,
  onClose,
  api,
  tenantId,
  currentUserId,
}: Readonly<{
  open: boolean
  onClose: () => void
  api: CaseApiClient
  tenantId: string
  /** Keycloak user id (JWT sub) — used to avoid removing yourself accidentally without confirm. */
  currentUserId?: string | null
}>) {
  const [members, setMembers] = useState<TenantMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TenantMemberRole>('author')
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; temporaryPassword: string } | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<TenantMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.listMembers({ tenantId })
      setMembers(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [api, tenantId])

  useEffect(() => {
    if (open) void loadMembers()
  }, [open, loadMembers])

  const handleCreate = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return
    setCreating(true)
    setError(null)
    try {
      const result = await api.createMember({ tenantId, email: trimmed, role })
      setEmail('')
      setRole('author')
      if (result.temporaryPassword) {
        setCreatedCreds({ email: result.email ?? trimmed, temporaryPassword: result.temporaryPassword })
      }
      void loadMembers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }, [api, tenantId, email, role, loadMembers])

  const handleRoleChange = useCallback(async (member: TenantMember, nextRole: TenantMemberRole) => {
    if (!member.role || member.role === nextRole) return
    setUpdatingUserId(member.userId)
    setError(null)
    try {
      await api.updateMember({ tenantId, userId: member.userId, role: nextRole })
      void loadMembers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdatingUserId(null)
    }
  }, [api, tenantId, loadMembers])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await api.deleteMember({ tenantId, userId: deleteTarget.userId })
      setDeleteTarget(null)
      void loadMembers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(false)
    }
  }, [api, tenantId, deleteTarget, loadMembers])

  const handleClose = useCallback(() => {
    setDeleteTarget(null)
    setCreatedCreds(null)
    setEmail('')
    setRole('author')
    setError(null)
    onClose()
  }, [onClose])

  return (
    <>
      <Dialog open={open && !deleteTarget} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Members</DialogTitle>
            <DialogDescription>
              Manage who can access this organization and their roles.
              New users get a temporary password and must change it on first login.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          {createdCreds && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="mb-3 text-sm font-medium text-green-800">
                Member added — copy the temporary password now, it will not be shown again.
                They will be required to set a new password on first login.
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Email</span>
                  <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs text-gray-800">
                    <span className="flex-1 select-all break-all">{createdCreds.email}</span>
                    <CopyButton text={createdCreds.email} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Temporary password</span>
                  <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs text-gray-800">
                    <span className="flex-1 select-all break-all">{createdCreds.temporaryPassword}</span>
                    <CopyButton text={createdCreds.temporaryPassword} />
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setCreatedCreds(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {loading && members.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">Loading...</p>
            )}

            {!loading && members.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                No members yet. Add someone below.
              </p>
            )}

            {members.map((m) => {
              const isSelf = Boolean(currentUserId && m.userId === currentUserId)
              return (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {m.email ?? m.username ?? m.userId}
                      {isSelf ? <span className="ml-1 text-xs font-normal text-gray-400">(you)</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">{roleLabel(m.role)}</p>
                  </div>
                  <select
                    className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
                    value={m.role ?? 'viewer'}
                    disabled={updatingUserId === m.userId}
                    onChange={(e) => void handleRoleChange(m, e.target.value as TenantMemberRole)}
                    aria-label={`Role for ${m.email ?? m.userId}`}
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Remove member"
                    onClick={() => setDeleteTarget(m)}
                    className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="member_email" className="text-xs font-medium text-gray-600">
                  Email
                </Label>
                <Input
                  id="member_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.org"
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleCreate()
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="member_role" className="text-xs font-medium text-gray-600">
                  Role
                </Label>
                <select
                  id="member_role"
                  className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700"
                  value={role}
                  onChange={(e) => setRole(e.target.value as TenantMemberRole)}
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {ROLE_OPTIONS.find((o) => o.value === role)?.hint}
            </p>
            <Button
              size="sm"
              className="mt-3"
              disabled={creating || !email.trim()}
              onClick={() => void handleCreate()}
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              {creating ? 'Adding...' : 'Add member'}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              Remove access for{' '}
              <span className="font-medium text-gray-800">
                {deleteTarget?.email ?? deleteTarget?.username ?? deleteTarget?.userId}
              </span>
              ? They will lose access to this organization until added again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
