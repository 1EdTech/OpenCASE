import { PlusIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { Button } from '@/ui/shared/components/ui/button'
import { FrameworkCard } from '@/ui/shared/components/FrameworkCard'
import type { HomeFramework } from '@/ui/home/frameworkStore'
import CreateFrameworkDialog, { type CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'

export default function HomeScreen({
  frameworks,
  onOpenFramework,
  onCreateNew,
}: {
  frameworks: HomeFramework[]
  onOpenFramework: (_id: string) => void
  onCreateNew: (_draft: CreateFrameworkDraft) => void
}) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">CASE Editor</div>
            <div className="text-sm text-slate-600">Open a framework to create, edit, and publish.</div>
          </div>

          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" aria-hidden />
            Create framework
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((fw) => (
            <FrameworkCard
              key={fw.id}
              cfDocument={fw.cfDocument}
              rightHint="Open to edit"
              primaryActionLabel="Open"
              primaryActionIcon="none"
              onPrimaryAction={() => onOpenFramework(fw.id)}
              onClick={() => onOpenFramework(fw.id)}
            />
          ))}
        </div>
      </div>

      <CreateFrameworkDialog
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreate={(draft) => {
          setCreateOpen(false)
          onCreateNew(draft)
        }}
      />
    </div>
  )
}

