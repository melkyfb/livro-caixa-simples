import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import type { Settings, Category, CategoryType, Account, AccountType, SignatureField } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/theme-provider';
import { 
  Plus, Trash2, Tag, Wallet, Landmark, 
  Monitor, ChevronRight, Printer, Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export const SettingsView = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  // States
  const [settings, setSettings] = useState<Settings>({
    id: 0, entityName: '', entityType: 'Empresa', country: 'Brasil', currency: 'BRL',
    customFieldsSchema: '[]', printSettings: '{"showSignatures": true, "signatures": []}'
  });
  const [showSignatures, setShowSignatures] = useState(true);
  const [signatures, setSignatures] = useState<SignatureField[]>([]);
  
  // Categorias & Contas states
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Dialogs Open States
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Formulário Entidade/Contas/Categorias temporários
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Local');
  const [initialBalance, setInitialBalance] = useState('0');
  
  const [newCatName, setNewCatName] = useState('');
  const [catTab, setCatTab] = useState<CategoryType>('Entrada');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, categoriesData, accountsData] = await Promise.all([
        apiService.getSettings().catch(() => null),
        apiService.getCategories(),
        apiService.getAccounts()
      ]);

      if (settingsData) {
        setSettings(settingsData);
        try {
          const p = JSON.parse(settingsData.printSettings || '{"showSignatures": true, "signatures": []}');
          setShowSignatures(p.showSignatures ?? true);
          setSignatures(p.signatures ?? []);
        } catch (e) { 
          setShowSignatures(true);
          setSignatures([]);
        }
      }

      setCategories(categoriesData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error loading settings data:", error);
    }
  };

  const handleQuickSaveCurrency = async (currency: string) => {
    try {
      const updatedSettings = { ...settings, currency };
      await apiService.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      toast({ title: "Moeda atualizada" });
    } catch (error) {
      toast({ title: "Erro ao atualizar moeda", variant: "destructive" });
    }
  };

  const handleToggleSignatures = async (value: boolean) => {
    setShowSignatures(value);
    const printSchema = JSON.stringify({ showSignatures: value, signatures });
    const updatedSettings = { ...settings, printSettings: printSchema };
    await apiService.updateSettings(updatedSettings);
    setSettings(updatedSettings);
    toast({ title: value ? "Assinaturas ativadas" : "Assinaturas desativadas" });
  };

  const handleAddSignature = () => {
    setSignatures([...signatures, { label: '', name: '' }]);
  };

  const handleRemoveSignature = (index: number) => {
    const newSigs = signatures.filter((_, i) => i !== index);
    setSignatures(newSigs);
    handleSaveSignatures(newSigs);
  };

  const handleUpdateSignature = (index: number, key: 'label' | 'name', val: string) => {
    const newSigs = [...signatures];
    newSigs[index][key] = val;
    setSignatures(newSigs);
  };

  const handleSaveSignatures = async (sigsToSave?: SignatureField[]) => {
    const targetSigs = sigsToSave || signatures;
    const printSchema = JSON.stringify({ showSignatures, signatures: targetSigs });
    const updatedSettings = { ...settings, printSettings: printSchema };
    await apiService.updateSettings(updatedSettings);
    setSettings(updatedSettings);
    toast({ title: "Assinaturas atualizadas" });
  };

  const handleAddAccount = async () => {
    if (!accountName.trim()) return;
    try {
      const balance = parseFloat(initialBalance) || 0;
      await apiService.createAccount({
        name: accountName,
        type: accountType,
        initial_balance: balance
      });
      setAccountName(''); 
      setInitialBalance('0'); 
      loadData();
      toast({ title: "Conta adicionada" });
    } catch (error) {
      toast({ title: "Erro ao adicionar conta", variant: "destructive" });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await apiService.createCategory({
        name: newCatName,
        type: catTab
      });
      setNewCatName(''); 
      loadData();
      toast({ title: "Categoria adicionada" });
    } catch (error) {
      toast({ title: "Erro ao adicionar categoria", variant: "destructive" });
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) => (
    <div 
      className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 relative", checked ? "bg-primary" : "bg-muted")}
      onClick={() => onChange(!checked)}
    >
      <div className={cn("w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300", checked ? "translate-x-6" : "translate-x-0")} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      
      {/* Header Settings */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl shadow-inner">
            <SettingsIcon className="w-8 h-8 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Configurações do Sistema</h2>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas, categorias e preferências técnicas.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Menu Lateral / Configurações da Entidade */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-black/5 dark:bg-white/5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contas e Categorias</h3>
            </div>
            <div className="p-2 space-y-1">
              <button onClick={() => setIsAccountsOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10 text-blue-500"><Landmark className="w-4 h-4" /></div>
                  <span className="font-medium">Contas e Bancos</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              <button onClick={() => setIsCategoriesOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-500/10 text-amber-500"><Tag className="w-4 h-4" /></div>
                  <span className="font-medium">Categorias</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>
          </div>

          {/* Software Info */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-black/5 dark:bg-white/5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Software</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-medium block text-sm">Versão SaaS</span>
                    <span className="text-[10px] text-muted-foreground">Otimizado para AWS Cloud</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Preferências */}
          <div className="glass-panel rounded-2xl overflow-hidden h-full">
            <div className="p-4 border-b border-white/5 bg-black/5 dark:bg-white/5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Preferências</h3>
            </div>
            <div className="p-4 space-y-6">
              
              {/* Tema */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary"><Monitor className="w-4 h-4" /></div>
                  <span className="font-medium">Tema do Aplicativo</span>
                </div>
                <div className="flex items-center bg-secondary/50 rounded-full p-1 border border-border">
                  <button onClick={() => setTheme('dark')} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-all", theme === 'dark' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Dark</button>
                  <button onClick={() => setTheme('light')} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-all", theme === 'light' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Light</button>
                  <button onClick={() => setTheme('system')} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-all", theme === 'system' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>Auto</button>
                </div>
              </div>

              {/* Mostrar Assinaturas */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary"><Printer className="w-4 h-4" /></div>
                  <div>
                    <span className="font-medium block">Imprimir Assinaturas</span>
                    <span className="text-xs text-muted-foreground">Exibir assinaturas nos relatórios</span>
                  </div>
                </div>
                <ToggleSwitch 
                  checked={showSignatures} 
                  onChange={handleToggleSignatures} 
                />
              </div>

              {/* Gerenciar Assinaturas */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10 text-primary"><Landmark className="w-4 h-4" /></div>
                    <span className="font-medium">Assinaturas do Relatório</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleAddSignature} className="text-primary hover:bg-primary/10">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {signatures.map((sig, i) => (
                    <div key={i} className="flex gap-2 items-end group animate-in slide-in-from-right-2 duration-300">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Cargo/Rótulo</Label>
                        <Input 
                          placeholder="Ex: Tesoureiro" 
                          className="h-8 text-xs bg-background/50" 
                          value={sig.label} 
                          onChange={(e) => handleUpdateSignature(i, 'label', e.target.value)}
                          onBlur={() => handleSaveSignatures()}
                        />
                      </div>
                      <div className="flex-[1.5] space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Nome</Label>
                        <Input 
                          placeholder="Nome Completo" 
                          className="h-8 text-xs bg-background/50" 
                          value={sig.name} 
                          onChange={(e) => handleUpdateSignature(i, 'name', e.target.value)}
                          onBlur={() => handleSaveSignatures()}
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveSignature(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {signatures.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhuma assinatura configurada.</p>
                  )}
                </div>
              </div>

              {/* Moeda Exibição */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary"><span className="w-4 h-4 flex items-center justify-center font-bold">$</span></div>
                  <span className="font-medium">Moeda Padrão</span>
                </div>
                <Select 
                  value={settings.currency} 
                  onValueChange={(v) => handleQuickSaveCurrency(v)}
                >
                  <SelectTrigger className="w-[100px] bg-secondary border-none h-8 font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-none">
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* DIALOGS */}
      
      {/* Dialog Contas */}
      <Dialog open={isAccountsOpen} onOpenChange={setIsAccountsOpen}>
        <DialogContent className="glass-panel border-none sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Contas e Bancos Vinculados</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1"><Label className="text-xs">Nome</Label><Input className="bg-background/50" value={accountName} onChange={(e) => setAccountName(e.target.value)} /></div>
              <div className="w-1/3 space-y-1"><Label className="text-xs">Tipo</Label>
                <Select value={accountType} onValueChange={(v: AccountType) => setAccountType(v)}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Banco">Banco</SelectItem><SelectItem value="Local">Caixa</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddAccount} size="icon"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", acc.type === 'Banco' ? "bg-blue-500/20 text-blue-500" : "bg-orange-500/20 text-orange-500")}>
                      {acc.type === 'Banco' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>
                    <div><p className="text-sm font-semibold">{acc.name}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Categorias */}
      <Dialog open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
        <DialogContent className="glass-panel border-none sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Gerenciar Categorias</DialogTitle></DialogHeader>
          <div className="py-4 space-y-6">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1"><Label className="text-xs">Nova Categoria</Label><Input className="bg-background/50" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} /></div>
              <div className="w-1/3 space-y-1"><Label className="text-xs">Tipo</Label>
                <Select value={catTab} onValueChange={(v: CategoryType) => setCatTab(v)}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Entrada">Entrada</SelectItem><SelectItem value="Saída">Saída</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddCategory} size="icon"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-background/40">
                  <span className="text-sm flex items-center gap-2">{cat.name} {cat.type === 'Entrada' ? <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1 rounded">IN</span> : <span className="text-[10px] text-destructive bg-destructive/10 px-1 rounded">OUT</span>}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};
