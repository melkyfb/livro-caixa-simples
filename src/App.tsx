import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { getDatabase } from '@/lib/database'
import { DashboardView } from '@/components/DashboardView'
import { TransactionsView } from '@/components/TransactionsView'
import { SettingsView } from '@/components/SettingsView'
import { ReportsView } from '@/components/ReportsView'
import { Toaster } from '@/components/ui/toaster'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getDatabase().then(() => {
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Carregando Livro Caixa...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'settings' && <SettingsView />}
      </Layout>
      <Toaster />
    </>
  )
}

export default App
