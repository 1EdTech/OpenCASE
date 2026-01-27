import { useCallback, useMemo, useState } from 'react'
import { EditorProvider } from '@/ui/editor/state/EditorContext'
import EditorCanvas from '@/ui/editor/EditorCanvas'
import HomeScreen from '@/ui/home/HomeScreen'
import { createNewFrameworkDraft, loadFrameworks, saveFrameworks, type HomeFramework } from '@/ui/home/frameworkStore'
import type { CreateFrameworkDraft } from '@/ui/home/CreateFrameworkDialog'

export default function App() {
  const [screen, setScreen] = useState<'home' | 'editor'>('home')
  const [frameworks, setFrameworks] = useState<HomeFramework[]>(() => loadFrameworks())
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null)

  const activeFramework = useMemo(() => {
    if (!activeFrameworkId) return null
    return frameworks.find((f) => f.id === activeFrameworkId) ?? null
  }, [frameworks, activeFrameworkId])

  const openFramework = useCallback((id: string) => {
    setActiveFrameworkId(id)
    setScreen('editor')
  }, [])

  const createNew = useCallback((draft: CreateFrameworkDraft) => {
    const fw = createNewFrameworkDraft(draft)
    setFrameworks((prev) => {
      const next = [fw, ...prev]
      saveFrameworks(next)
      return next
    })
    setActiveFrameworkId(fw.id)
    setScreen('editor')
  }, [])

  if (screen === 'home') {
    return <HomeScreen frameworks={frameworks} onOpenFramework={openFramework} onCreateNew={createNew} />
  }

  if (!activeFramework) {
    return <HomeScreen frameworks={frameworks} onOpenFramework={openFramework} onCreateNew={createNew} />
  }

  return (
    <EditorProvider initialGraph={activeFramework.graph} graphKey={activeFramework.id}>
      <EditorCanvas
        onBack={() => {
          setScreen('home')
        }}
      />
    </EditorProvider>
  )
}

