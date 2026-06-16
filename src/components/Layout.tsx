import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { LayoutDashboard, ArrowLeftRight, Settings, FileText, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <Button
    variant="ghost"
    className={cn(
      "w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground"
    )}
    onClick={onClick}
  >
    <Icon className="h-4 w-4" />
    {label}
  </Button>
);

export const Layout = ({ children, activeTab, setActiveTab }: { children: React.ReactNode, activeTab: string, setActiveTab: (tab: string) => void }) => {
  const [appVersion] = useState('v0.2.0-saas');
  const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    apiService.getSettings().then(data => {
      if (data && data.profile_image) {
        setProfileImage(data.profile_image);
      }
    }).catch(() => {});
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações', icon: ArrowLeftRight },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden bg-glow">
      {/* Sidebar */}
      <aside className="w-64 border-r glass-panel flex flex-col print:hidden sidebar-glow">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center p-2 shadow-lg border border-primary/20">
            <img src="/app-icon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Livro Caixa</h1>
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">Simples</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <div className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Menu Principal</div>
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>
        
        <div className="px-4 py-6 space-y-1">
          <div className="mb-4 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Usuário</div>
          <SidebarItem icon={User} label="Meu Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        <div className="p-4 border-t border-white/5 text-[10px] text-muted-foreground text-center font-mono opacity-50">
          {appVersion || 'v0.1.0'}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        <header className="h-20 border-b border-white/5 bg-transparent backdrop-blur-md flex items-center justify-between px-10 print:hidden">
          <div>
            <h2 className="text-xl font-bold tracking-tight capitalize">{activeTab}</h2>
            <p className="text-xs text-muted-foreground">Bem-vindo de volta ao seu controle financeiro</p>
          </div>
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:border-primary transition-colors"
              onClick={() => setActiveTab('profile')}
            >
              {profileImage ? (
                <img src={profileImage} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-10 print:p-0">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
