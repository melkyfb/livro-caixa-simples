import { useState, useEffect } from 'react';
import { getDatabase, saveDatabase } from '@/lib/database';
import type { Account, Category, CategoryType, Transaction } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Landmark, ShoppingCart, Briefcase, ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type FilterType = 'ALL' | 'INCOME' | 'EXPENSES';

export const TransactionsView = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [currency, setCurrency] = useState('BRL');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CategoryType>('Entrada');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await getDatabase();
    
    // Load Settings
    const settingsResult = db.exec("SELECT currency FROM settings LIMIT 1");
    if (settingsResult.length > 0) {
      setCurrency(settingsResult[0].values[0][0] as string || 'BRL');
    }

    // Load Accounts
    const accResult = db.exec("SELECT * FROM accounts");
    if (accResult.length > 0) {
      setAccounts(accResult[0].values.map(r => ({ id: r[0], name: r[1], type: r[2], initialBalance: r[3], currentBalance: r[4] })) as any);
    }

    // Load Categories
    const catResult = db.exec("SELECT * FROM categories");
    if (catResult.length > 0) {
      setCategories(catResult[0].values.map(r => ({ id: r[0], name: r[1], type: r[2] })) as any);
    }

    // Load Transactions
    const transResult = db.exec(`
      SELECT t.*, a.name as accountName, c.name as categoryName 
      FROM transactions t 
      LEFT JOIN accounts a ON t.accountId = a.id 
      LEFT JOIN categories c ON t.categoryId = c.id
      ORDER BY t.date DESC, t.id DESC
    `);
    if (transResult.length > 0) {
      setTransactions(transResult[0].values.map(r => ({ 
        id: r[0], date: r[1], value: r[2], description: r[3], type: r[4], 
        accountId: r[5], destinationAccountId: r[6], categoryId: r[7],
        accountName: r[10], categoryName: r[11] 
      })) as any);
    } else {
      setTransactions([]);
    }
  };

  const handleAddTransaction = async () => {
    if (!value || !accountId || (type !== 'Transferência' && !categoryId) || (type === 'Transferência' && !destinationAccountId)) return;

    const db = await getDatabase();
    const val = parseFloat(value);
    
    db.run(
      "INSERT INTO transactions (date, value, description, type, accountId, destinationAccountId, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [date, val, description, type, parseInt(accountId), destinationAccountId ? parseInt(destinationAccountId) : null, categoryId ? parseInt(categoryId) : null]
    );

    // Atualizar Saldo
    if (type === 'Entrada') {
      db.run("UPDATE accounts SET currentBalance = currentBalance + ? WHERE id = ?", [val, parseInt(accountId)]);
    } else if (type === 'Saída') {
      db.run("UPDATE accounts SET currentBalance = currentBalance - ? WHERE id = ?", [val, parseInt(accountId)]);
    } else if (type === 'Transferência' && destinationAccountId) {
      db.run("UPDATE accounts SET currentBalance = currentBalance - ? WHERE id = ?", [val, parseInt(accountId)]);
      db.run("UPDATE accounts SET currentBalance = currentBalance + ? WHERE id = ?", [val, parseInt(destinationAccountId)]);
    }

    saveDatabase(db);
    setValue('');
    setDescription('');
    setIsAddModalOpen(false);
    loadData();
  };

  const handleDeleteTransaction = async (trans: any) => {
    const db = await getDatabase();
    
    // Reverter Saldo
    if (trans.type === 'Entrada') {
      db.run("UPDATE accounts SET currentBalance = currentBalance - ? WHERE id = ?", [trans.value, trans.accountId]);
    } else if (trans.type === 'Saída') {
      db.run("UPDATE accounts SET currentBalance = currentBalance + ? WHERE id = ?", [trans.value, trans.accountId]);
    } else if (trans.type === 'Transferência' && trans.destinationAccountId) {
      db.run("UPDATE accounts SET currentBalance = currentBalance + ? WHERE id = ?", [trans.value, trans.accountId]);
      db.run("UPDATE accounts SET currentBalance = currentBalance - ? WHERE id = ?", [trans.value, trans.destinationAccountId]);
    }

    db.run("DELETE FROM transactions WHERE id = ?", [trans.id]);
    saveDatabase(db);
    loadData();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val);
  
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const getCategoryIcon = (catName: string) => {
    const name = (catName || '').toLowerCase();
    if (name.includes('mercado') || name.includes('groceries')) return <ShoppingCart className="w-5 h-5 text-emerald-500" />;
    if (name.includes('salário') || name.includes('salary') || name.includes('business')) return <Briefcase className="w-5 h-5 text-emerald-500" />;
    if (name.includes('banco') || name.includes('bank')) return <Landmark className="w-5 h-5 text-emerald-500" />;
    return <ArrowLeftRight className="w-5 h-5 text-emerald-500" />;
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'ALL') return true;
    if (filter === 'INCOME') return t.type === 'Entrada';
    if (filter === 'EXPENSES') return t.type === 'Saída';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 mt-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight uppercase">Transações Financeiras</h2>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-6">
          <Plus className="mr-2 h-4 w-4" /> Nova Transação
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button 
          onClick={() => setFilter('ALL')}
          className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors border border-transparent", filter === 'ALL' ? "bg-primary text-primary-foreground" : "glass-panel text-muted-foreground hover:text-foreground")}
        >
          [TODAS]
        </button>
        <button 
          onClick={() => setFilter('INCOME')}
          className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors border flex items-center gap-2", filter === 'INCOME' ? "bg-primary text-primary-foreground border-transparent" : "glass-panel border-white/10 text-muted-foreground hover:text-foreground")}
        >
          <ArrowDownLeft className="w-3 h-3" /> [ENTRADAS]
        </button>
        <button 
          onClick={() => setFilter('EXPENSES')}
          className={cn("px-4 py-1.5 rounded-md text-sm font-semibold transition-colors border flex items-center gap-2", filter === 'EXPENSES' ? "bg-primary text-primary-foreground border-transparent" : "glass-panel border-white/10 text-muted-foreground hover:text-foreground")}
        >
          <ArrowUpRight className="w-3 h-3" /> [SAÍDAS]
        </button>
        <button className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors border glass-panel border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-not-allowed opacity-50">
          [CATEGORIAS] <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        <div className="col-span-3">Data</div>
        <div className="col-span-4">Descrição</div>
        <div className="col-span-2">Categoria</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1 text-right">Valor</div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic glass-panel rounded-xl">Nenhuma transação encontrada.</div>
        ) : (
          filteredTransactions.map((t: any) => (
            <div 
              key={t.id} 
              className={cn(
                "glass-panel p-4 rounded-xl flex items-center grid grid-cols-12 gap-4 group transition-all duration-300 relative overflow-hidden",
                t.type === 'Entrada' ? "hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]" : 
                t.type === 'Saída' ? "hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "hover:border-blue-500/50"
              )}
            >
              {/* Data & Icon */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background/50 border border-white/5 flex items-center justify-center">
                  {getCategoryIcon(t.categoryName || t.description)}
                </div>
                <span className="text-sm text-muted-foreground font-medium">{formatDate(t.date)}</span>
              </div>
              
              {/* Description */}
              <div className="col-span-4 flex items-center">
                <span className="font-bold text-foreground truncate pr-4">{t.description || (t.type === 'Transferência' ? 'Transferência' : 'Sem descrição')}</span>
              </div>
              
              {/* Category */}
              <div className="col-span-2 flex items-center">
                <span className="text-sm text-muted-foreground truncate">{t.categoryName || t.accountName || '-'}</span>
              </div>
              
              {/* Status */}
              <div className="col-span-2 flex items-center">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 opacity-50"/> [CONCLUÍDO]</span>
              </div>
              
              {/* Amount */}
              <div className="col-span-1 flex flex-col items-end justify-center">
                <span className={cn(
                  "font-bold text-base whitespace-nowrap",
                  t.type === 'Entrada' ? "text-emerald-500" : 
                  t.type === 'Saída' ? "text-red-400" : "text-blue-400"
                )}>
                  {t.type === 'Saída' ? '-' : '+'}{formatCurrency(t.value)}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 whitespace-nowrap",
                  t.type === 'Entrada' ? "bg-emerald-500/20 text-emerald-500" : 
                  t.type === 'Saída' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {t.type === 'Entrada' ? 'INCOME' : t.type === 'Saída' ? 'EXPENSE' : 'TRANSFER'}
                </span>
              </div>

              {/* Delete Button (Appears on Hover) */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all h-8 w-8" 
                onClick={() => handleDeleteTransaction(t)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add Transaction Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="glass-panel border-none sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Transação</Label>
              <Tabs value={type} onValueChange={(v) => { setType(v as CategoryType); setCategoryId(''); }}>
                <TabsList className="grid w-full grid-cols-3 bg-background/50">
                  <TabsTrigger value="Entrada" className="text-xs">Entrada</TabsTrigger>
                  <TabsTrigger value="Saída" className="text-xs">Saída</TabsTrigger>
                  <TabsTrigger value="Transferência" className="text-xs">Transferência</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input className="bg-background/50 border-white/10" id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input className="bg-background/50 border-white/10" id="value" type="number" step="0.01" placeholder="0.00" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input className="bg-background/50 border-white/10" id="desc" placeholder="Ex: Mercado, Assinatura Figma..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{type === 'Transferência' ? 'Conta de Origem' : 'Conta'}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="bg-background/50 border-white/10">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {type === 'Transferência' ? (
              <div className="space-y-2">
                <Label>Conta de Destino</Label>
                <Select value={destinationAccountId} onValueChange={setDestinationAccountId}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Selecione o destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.id.toString() !== accountId).map(acc => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === type).map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddTransaction}>Salvar Lançamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
