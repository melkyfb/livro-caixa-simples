import { useState, useEffect } from 'react';
import { getDatabase, saveDatabase } from '@/lib/database';
import type { Account, Category, CategoryType, Transaction } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TransactionsView = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
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
    if (!value || !accountId || (type !== 'Transferência' && !categoryId)) return;

    const db = await getDatabase();
    const val = parseFloat(value);
    
    db.run(
      "INSERT INTO transactions (date, value, description, type, accountId, destinationAccountId, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [date, val, description, type, parseInt(accountId), destinationAccountId ? parseInt(destinationAccountId) : null, categoryId ? parseInt(categoryId) : null]
    );

    // Atualizar Saldo da Conta
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Lançamentos</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Novo Lançamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Transação</Label>
              <Tabs value={type} onValueChange={(v) => { setType(v as CategoryType); setCategoryId(''); }}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="Entrada" className="text-xs">Entrada</TabsTrigger>
                  <TabsTrigger value="Saída" className="text-xs">Saída</TabsTrigger>
                  <TabsTrigger value="Transferência" className="text-xs">Transf.</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor</Label>
                <Input id="value" type="number" step="0.01" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input id="desc" placeholder="Ex: Dízimo mensal, Mercado..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{type === 'Transferência' ? 'Conta de Origem' : 'Conta'}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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

            <Button className="w-full mt-4" onClick={handleAddTransaction}>
              <Plus className="mr-2 h-4 w-4" /> Lançar
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Transações */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">Nenhum lançamento registrado.</div>
              ) : (
                <div className="border rounded-md divide-y overflow-hidden">
                  {transactions.map((t: any) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-full",
                          t.type === 'Entrada' ? "bg-green-100 text-green-600" : 
                          t.type === 'Saída' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {t.type === 'Entrada' ? <ArrowDownLeft className="h-4 w-4" /> : 
                           t.type === 'Saída' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t.description || t.categoryName || 'Sem descrição'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(t.date).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span>{t.accountName} {t.destinationAccountId ? `→ Destino` : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={cn(
                          "font-bold text-sm",
                          t.type === 'Entrada' ? "text-green-600" : 
                          t.type === 'Saída' ? "text-red-600" : "text-blue-600"
                        )}>
                          {t.type === 'Saída' ? '-' : '+'}{formatCurrency(t.value)}
                        </p>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTransaction(t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
