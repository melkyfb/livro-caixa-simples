import { useState, useEffect } from 'react';
import { getDatabase, saveDatabase, exportDatabase, importDatabase, deleteDatabaseFile } from '@/lib/database';
import type { Settings, CustomField, Category, CategoryType, Account, AccountType, SignatureField } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/theme-provider';
import { 
  Building2, Church, User, Plus, Trash2, Tag, 
  ShieldCheck, AlertTriangle, Pencil, Wallet, Landmark, 
  Upload, Download, Moon, Sun, Monitor, ChevronRight, Check, Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export const SettingsView = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  // States
  const [settings, setSettings] = useState<Settings>({
    id: 1, entityName: '', entityType: 'Empresa', country: 'Brasil', currency: 'BRL',
    customFieldsSchema: '[]', printSettings: '{"showSignatures": true, "signatures": []}'
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showSignatures, setShowSignatures] = useState(true);
  const [signatures, setSignatures] = useState<SignatureField[]>([]);
  
  // Categorias & Contas states
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>({});

  // Dialogs Open States
  const [isEntityOpen, setIsEntityOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isDeleteDatabaseDialogOpen, setIsDeleteDatabaseDialogOpen] = useState(false);

  // Formulário Entidade/Contas/Categorias temporários
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Local');
  const [initialBalance, setInitialBalance] = useState('0');
  
  const [newCatName, setNewCatName] = useState('');
  const [catTab, setCatTab] = useState<CategoryType>('Entrada');

  useEffect(() => {
    loadSettings();
    loadCategories();
    loadAccounts();
  }, []);

  const loadSettings = async () => {
    const db = await getDatabase();
    const result = db.exec("SELECT * FROM settings LIMIT 1");
    if (result.length > 0) {
      const r = result[0].values[0];
      const schema = r[5] as string || '[]';
      const printStr = r[6] as string || '{"showSignatures": true, "signatures": []}';
      
      setSettings({
        id: r[0] as number,
        entityName: r[1] as string || '',
        entityType: (r[2] as any === 'Sociedade' ? 'Pessoal' : r[2] as any) || 'Empresa',
        country: r[3] as string || 'Brasil',
        currency: r[4] as string || 'BRL',
        customFieldsSchema: schema,
        printSettings: printStr
      });
      
      try { setCustomFields(JSON.parse(schema)); } catch (e) { setCustomFields([]); }
      try {
        const p = JSON.parse(printStr);
        setShowSignatures(p.showSignatures ?? true);
        setSignatures(p.signatures ?? []);
      } catch (e) { 
        setShowSignatures(true);
        setSignatures([]);
      }
    }
  };

  const loadCategories = async () => {
    const db = await getDatabase();
    const catResult = db.exec("SELECT * FROM categories");
    const countsResult = db.exec("SELECT categoryId, COUNT(*) FROM transactions GROUP BY categoryId");
    
    if (catResult.length > 0) {
      const rows = catResult[0].values;
      setCategories(rows.map(row => ({
        id: row[0] as number, name: row[1] as string, type: row[2] as CategoryType,
      })));
    }
    const counts: Record<number, number> = {};
    if (countsResult.length > 0) {
      countsResult[0].values.forEach(row => { counts[row[0] as number] = row[1] as number; });
    }
    setCategoryCounts(counts);
  };

  const loadAccounts = async () => {
    const db = await getDatabase();
    const result = db.exec("SELECT * FROM accounts");
    if (result.length > 0) {
      const rows = result[0].values;
      setAccounts(rows.map(row => ({
        id: row[0] as number, name: row[1] as string, type: row[2] as AccountType,
        initialBalance: row[3] as number, currentBalance: row[4] as number,
      })));
    }
  };

  const handleSaveSettings = async () => {
    const db = await getDatabase();
    const result = db.exec("SELECT id FROM settings LIMIT 1");
    const schema = JSON.stringify(customFields);
    const printSchema = JSON.stringify({ showSignatures, signatures });
    
    setSettings(prev => ({ ...prev, customFieldsSchema: schema, printSettings: printSchema }));

    if (result.length > 0) {
      db.run(
        "UPDATE settings SET entityName = ?, entityType = ?, country = ?, currency = ?, customFieldsSchema = ?, printSettings = ? WHERE id = ?",
        [settings.entityName, settings.entityType, settings.country, settings.currency, schema, printSchema, settings.id]
      );
    } else {
      db.run(
        "INSERT INTO settings (entityName, entityType, country, currency, customFieldsSchema, printSettings) VALUES (?, ?, ?, ?, ?, ?)",
        [settings.entityName, settings.entityType, settings.country, settings.currency, schema, printSchema]
      );
    }
    
    saveDatabase(db);
    toast({ title: "Configurações salvas" });
  };

  const handleExport = async () => {
    try {
      const success = await exportDatabase();
      if (success) toast({ title: "Banco exportado com sucesso!" });
    } catch (e) { toast({ title: "Erro ao exportar", variant: "destructive" }); }
  };

  const handleImport = async () => {
    try {
      const success = await importDatabase();
      if (success) {
        toast({ title: "Banco importado" });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) { toast({ title: "Erro ao importar", variant: "destructive" }); }
  };

  const deleteDatabase = async () => {
    await deleteDatabaseFile();
    window.location.reload();
  };

  const handleAddAccount = async () => {
    if (!accountName.trim()) return;
    const db = await getDatabase();
    const balance = parseFloat(initialBalance) || 0;
    db.run(
      "INSERT INTO accounts (name, type, initialBalance, currentBalance) VALUES (?, ?, ?, ?)",
      [accountName, accountType, balance, balance]
    );
    saveDatabase(db);
    setAccountName(''); setInitialBalance('0'); loadAccounts();
    toast({ title: "Conta adicionada" });
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const db = await getDatabase();
    db.run("INSERT INTO categories (name, type) VALUES (?, ?)", [newCatName, catTab]);
    saveDatabase(db);
    setNewCatName(''); loadCategories();
    toast({ title: "Categoria adicionada" });
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
      
      {/* Header Profile */}
      <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl shadow-inner">
            {settings.entityType === 'Empresa' ? <Building2 /> : settings.entityType === 'Igreja' ? <Church /> : <User />}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{settings.entityName || 'Sua Entidade'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Ativo
              </span>
              <span className="text-sm text-muted-foreground">{settings.entityType}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" className="hidden sm:flex" onClick={() => setIsEntityOpen(true)}>Editar Perfil</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Menu Lateral / Configurações da Entidade */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-black/5 dark:bg-white/5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Entidade e Contas</h3>
            </div>
            <div className="p-2 space-y-1">
              <button onClick={() => setIsEntityOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary"><User className="w-4 h-4" /></div>
                  <span className="font-medium">Perfil e Moeda</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              
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

          {/* Segurança e Dados */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-black/5 dark:bg-white/5">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dados e Transações</h3>
            </div>
            <div className="p-2 space-y-1">
              <button onClick={handleExport} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-500"><Download className="w-4 h-4" /></div>
                  <span className="font-medium">Fazer Backup (Exportar)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              <button onClick={handleImport} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-purple-500/10 text-purple-500"><Upload className="w-4 h-4" /></div>
                  <span className="font-medium">Restaurar (Importar)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              
              <button onClick={() => setIsDeleteDatabaseDialogOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></div>
                  <span className="font-medium">Apagar Banco de Dados</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-colors" />
              </button>
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
                  onChange={(v) => { setShowSignatures(v); handleSaveSettings(); }} 
                />
              </div>

              {/* Moeda Exibição */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary"><span className="w-4 h-4 flex items-center justify-center font-bold">$</span></div>
                  <span className="font-medium">Moeda Padrão</span>
                </div>
                <span className="font-mono text-sm bg-secondary px-2 py-1 rounded text-muted-foreground">{settings.currency}</span>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* DIALOGS */}
      
      {/* Dialog Entidade */}
      <Dialog open={isEntityOpen} onOpenChange={setIsEntityOpen}>
        <DialogContent className="glass-panel border-none sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Editar Perfil</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Entidade</Label>
              <Input className="bg-background/50" value={settings.entityName} onChange={(e) => setSettings({...settings, entityName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={settings.entityType} onValueChange={(v) => setSettings({...settings, entityType: v as any})}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Empresa">Empresa</SelectItem>
                  <SelectItem value="Igreja">Igreja / ONG</SelectItem>
                  <SelectItem value="Pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEntityOpen(false)}>Cancelar</Button>
            <Button onClick={() => { handleSaveSettings(); setIsEntityOpen(false); }}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {categoryCounts[cat.id] > 0 && <span className="text-xs text-muted-foreground">{categoryCounts[cat.id]} transações</span>}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete DB */}
      <Dialog open={isDeleteDatabaseDialogOpen} onOpenChange={setIsDeleteDatabaseDialogOpen}>
        <DialogContent className="glass-panel border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Apagar Banco de Dados</DialogTitle>
            <DialogDescription>Atenção! Isso removerá todas as transações, categorias e contas criadas. Não tem volta.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDatabaseDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteDatabase}>Sim, Apagar Tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};