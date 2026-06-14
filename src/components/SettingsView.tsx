import { useState, useEffect } from 'react';
import { getDatabase, saveDatabase } from '@/lib/database';
import type { Settings, CustomField, Category, CategoryType, Account, AccountType, SignatureField } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Building2, Church, User, Plus, Trash2, Tag, 
  Settings as SettingsIcon, ShieldCheck, AlertTriangle, Pencil,
  Wallet, Landmark
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export const SettingsView = () => {
  const { toast } = useToast();
  const [activeSettingsTab, setActiveSettingsTab] = useState('entity');
  
  // Entity State
  const [settings, setSettings] = useState<Settings>({
    id: 1,
    entityName: '',
    entityType: 'Empresa',
    country: 'Brasil',
    currency: 'BRL',
    customFieldsSchema: '[]',
    printSettings: '{"showSignatures": true, "signatures": []}'
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // Print State
  const [showSignatures, setShowSignatures] = useState(true);
  const [signatures, setSignatures] = useState<SignatureField[]>([]);

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>({});
  const [newCatName, setNewCatName] = useState('');
  const [catTab, setCatTab] = useState<CategoryType>('Entrada');
  
  // Account State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Local');
  const [initialBalance, setInitialBalance] = useState('0');

  // Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [migrationCategoryId, setMigrationCategoryId] = useState<string>('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');

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
        id: row[0] as number,
        name: row[1] as string,
        type: row[2] as CategoryType,
      })));
    }

    const counts: Record<number, number> = {};
    if (countsResult.length > 0) {
      countsResult[0].values.forEach(row => {
        counts[row[0] as number] = row[1] as number;
      });
    }
    setCategoryCounts(counts);
  };

  const loadAccounts = async () => {
    const db = await getDatabase();
    const result = db.exec("SELECT * FROM accounts");
    if (result.length > 0) {
      const rows = result[0].values;
      setAccounts(rows.map(row => ({
        id: row[0] as number,
        name: row[1] as string,
        type: row[2] as AccountType,
        initialBalance: row[3] as number,
        currentBalance: row[4] as number,
      })));
    }
  };

  const handleSaveSettings = async () => {
    const db = await getDatabase();
    const result = db.exec("SELECT id FROM settings LIMIT 1");
    const schema = JSON.stringify(customFields);
    const printSchema = JSON.stringify({ showSignatures, signatures });
    
    // Atualizar o objeto local settings para que as mudanças reflitam em outras partes
    setSettings(prev => ({
      ...prev,
      customFieldsSchema: schema,
      printSettings: printSchema
    }));

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

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const db = await getDatabase();
    db.run("INSERT INTO categories (name, type) VALUES (?, ?)", [newCatName, catTab]);
    saveDatabase(db);
    setNewCatName('');
    loadCategories();
    toast({ title: "Categoria adicionada" });
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
    setAccountName('');
    setInitialBalance('0');
    loadAccounts();
    toast({ title: "Conta adicionada" });
  };

  const openDeleteDialog = (category: Category) => {
    if (category.name === 'Diversos') {
      toast({ 
        title: "Ação bloqueada", 
        description: "A categoria 'Diversos' é obrigatória e não pode ser excluída.",
        variant: "destructive"
      });
      return;
    }
    setCategoryToDelete(category);
    setMigrationCategoryId('');
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const db = await getDatabase();
    const count = categoryCounts[categoryToDelete.id] || 0;

    if (count > 0) {
      if (!migrationCategoryId) {
        toast({ title: "Erro", description: "Selecione uma categoria de destino para as movimentações.", variant: "destructive" });
        return;
      }
      db.run("UPDATE transactions SET categoryId = ? WHERE categoryId = ?", [migrationCategoryId, categoryToDelete.id]);
    }

    db.run("DELETE FROM categories WHERE id = ?", [categoryToDelete.id]);
    saveDatabase(db);
    setIsDeleteDialogOpen(false);
    loadCategories();
    toast({ title: "Categoria excluída", description: count > 0 ? "Movimentações migradas com sucesso." : "" });
  };

  const openEditDialog = (category: Category) => {
    if (category.name === 'Diversos') {
      toast({ 
        title: "Ação bloqueada", 
        description: "A categoria 'Diversos' não pode ser renomeada.",
        variant: "destructive"
      });
      return;
    }
    setCategoryToEdit(category);
    setEditCatName(category.name);
    setIsEditDialogOpen(true);
  };

  const confirmEditCategory = async () => {
    if (!categoryToEdit || !editCatName.trim()) return;
    const db = await getDatabase();
    db.run("UPDATE categories SET name = ? WHERE id = ?", [editCatName, categoryToEdit.id]);
    saveDatabase(db);
    setIsEditDialogOpen(false);
    loadCategories();
    toast({ title: "Categoria atualizada" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <h3 className="text-2xl font-bold">Configurações</h3>
      </div>

      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="entity">Entidade</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="customization">Categorias</TabsTrigger>
          <TabsTrigger value="print">Impressão</TabsTrigger>
        </TabsList>

        <TabsContent value="entity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Dados da Entidade</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Entidade</Label>
                  <Input value={settings.entityName} onChange={(e) => setSettings({...settings, entityName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ id: 'Empresa', icon: Building2 }, { id: 'Igreja', icon: Church }, { id: 'Pessoal', icon: User }].map((type) => (
                      <Button
                        key={type.id}
                        variant={settings.entityType === type.id ? "default" : "outline"}
                        className="flex flex-col h-16 gap-1"
                        onClick={() => setSettings({...settings, entityType: type.id as any})}
                      >
                        <type.icon className="h-4 w-4" />
                        <span className="text-[10px] uppercase">{type.id}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleSaveSettings}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Campos Adicionais</CardTitle><CardDescription>Máximo 5 campos.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {customFields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input placeholder="Rótulo" className="flex-1" value={field.label} onChange={(e) => {
                      const newFields = [...customFields];
                      newFields[index].label = e.target.value;
                      setCustomFields(newFields);
                    }} />
                    <Input placeholder="Valor" className="flex-[2]" value={field.value} onChange={(e) => {
                      const newFields = [...customFields];
                      newFields[index].value = e.target.value;
                      setCustomFields(newFields);
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const newFields = [...customFields];
                      newFields.splice(index, 1);
                      setCustomFields(newFields);
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                {customFields.length < 5 && (
                  <Button variant="outline" className="w-full border-dashed" onClick={() => setCustomFields([...customFields, { label: '', value: '' }])}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Campo
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader><CardTitle>Nova Conta</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ex: Banco do Brasil" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={accountType} onValueChange={(v: AccountType) => setAccountType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Banco">Banco</SelectItem>
                      <SelectItem value="Local">Local (Dinheiro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo Inicial</Label>
                  <Input type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleAddAccount}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Minhas Contas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="border rounded-lg overflow-hidden flex flex-col">
                      <div className={cn("h-1 w-full", acc.type === 'Banco' ? "bg-blue-500" : "bg-orange-500")} />
                      <div className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-full">
                          {acc.type === 'Banco' ? <Landmark className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{acc.name}</p>
                          <p className="text-xs text-muted-foreground">{acc.type}</p>
                          <p className="font-bold text-lg mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(acc.currentBalance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader><CardTitle>Nova Categoria</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Ex: Combustível" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Tabs value={catTab} onValueChange={(v) => setCatTab(v as CategoryType)}>
                    <TabsList className="w-full">
                      <TabsTrigger value="Entrada" className="flex-1">Entrada</TabsTrigger>
                      <TabsTrigger value="Saída" className="flex-1">Saída</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Button className="w-full" onClick={handleAddCategory}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Categorias de {catTab}</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Protegido</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                  {categories.filter(c => c.type === catTab).map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md group hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            {cat.name}
                            {cat.name === 'Diversos' && <ShieldCheck className="h-3 w-3 text-blue-500" />}
                          </p>
                          {categoryCounts[cat.id] > 0 && <p className="text-[10px] text-muted-foreground">{categoryCounts[cat.id]} movimentações</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(cat)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(cat)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="print" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader><CardTitle>Opções de Impressão</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-2 border rounded-md">
                  <Label className="cursor-pointer" htmlFor="show-sig">Exibir Assinaturas</Label>
                  <input id="show-sig" type="checkbox" checked={showSignatures} onChange={(e) => setShowSignatures(e.target.checked)} className="h-4 w-4" />
                </div>
                <Button className="w-full" onClick={handleSaveSettings}><Save className="mr-2 h-4 w-4" /> Salvar</Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Configurar Rodapé (Assinaturas)</CardTitle>
                <CardDescription>Até 10 campos para assinatura.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {signatures.map((sig, index) => (
                  <div key={index} className="flex gap-2 items-end border p-3 rounded-md bg-secondary/10">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase">Cargo / Título</Label>
                      <Input placeholder="Ex: Tesoreiro" value={sig.label} onChange={(e) => {
                        const newSigs = [...signatures];
                        newSigs[index].label = e.target.value;
                        setSignatures(newSigs);
                      }} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] uppercase">Nome (Opcional)</Label>
                      <Input placeholder="Nome completo" value={sig.name} onChange={(e) => {
                        const newSigs = [...signatures];
                        newSigs[index].name = e.target.value;
                        setSignatures(newSigs);
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const newSigs = [...signatures];
                      newSigs.splice(index, 1);
                      setSignatures(newSigs);
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                {signatures.length < 10 && (
                  <Button variant="outline" className="w-full border-dashed" onClick={() => setSignatures([...signatures, { label: '', name: '' }])}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Assinatura
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Migration / Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {categoryCounts[categoryToDelete?.id || 0] > 0 ? <AlertTriangle className="text-amber-500" /> : <Trash2 />}
              Excluir Categoria
            </DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir <strong>{categoryToDelete?.name}</strong>?</DialogDescription>
          </DialogHeader>
          {categoryCounts[categoryToDelete?.id || 0] > 0 && (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-xs">
                Esta categoria possui <strong>{categoryCounts[categoryToDelete?.id || 0]} movimentações</strong>. 
                Para excluir, você deve migrá-las para outra categoria abaixo:
              </div>
              <div className="space-y-2">
                <Label>Migrar para:</Label>
                <Select value={migrationCategoryId} onValueChange={setMigrationCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a nova categoria" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === categoryToDelete?.type && c.id !== categoryToDelete?.id).map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDeleteCategory}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear Categoria</DialogTitle><DialogDescription>As movimentações existentes serão mantidas nesta categoria.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Novo Nome</Label>
            <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
            {categoryCounts[categoryToEdit?.id || 0] > 0 && (
              <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {categoryCounts[categoryToEdit?.id || 0]} movimentações serão atualizadas.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmEditCategory}>Salvar Alteração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};