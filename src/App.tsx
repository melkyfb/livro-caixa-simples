import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { DashboardView } from '@/components/DashboardView'
import { TransactionsView } from '@/components/TransactionsView'
import { ProfileView } from '@/components/ProfileView'
import { SettingsView } from '@/components/SettingsView'
import { ReportsView } from '@/components/ReportsView'
import { Toaster } from '@/components/ui/toaster'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <>
          <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'profile' && <ProfileView user={user} signOut={signOut} />}
            {activeTab === 'transactions' && <TransactionsView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'settings' && <SettingsView />}
          </Layout>
          <Toaster />
        </>
      )}
    </Authenticator>
  )
}

export default App
