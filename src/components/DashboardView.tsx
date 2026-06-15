import { useState, useEffect } from 'react';
import { getDatabase } from '@/lib/database';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Wallet, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

type Period = 'month' | 'quarter' | 'semester' | 'year';

export const DashboardView = () => {
  const [period, setPeriod] = useState<Period>('month');
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0, previousBalance: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [entityName, setEntityName] = useState('');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    const db = await getDatabase();
    
    // Load Settings
    const settingsResult = db.exec("SELECT currency, entityName FROM settings LIMIT 1");
    if (settingsResult.length > 0) {
      setCurrency(settingsResult[0].values[0][0] as string || 'BRL');
      setEntityName(settingsResult[0].values[0][1] as string || '');
    }

    // Calcular datas baseadas no período
    const now = new Date();
    let startDate = new Date();
    if (period === 'month') startDate.setDate(1);
    else if (period === 'quarter') startDate.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
    else if (period === 'semester') startDate.setMonth(now.getMonth() < 6 ? 0 : 6, 1);
    else if (period === 'year') startDate.setMonth(0, 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Totals
    const income = (db.exec("SELECT SUM(value) FROM transactions WHERE type = 'Entrada' AND date >= ?", [startDateStr])[0]?.values[0][0] as number) || 0;
    const expense = (db.exec("SELECT SUM(value) FROM transactions WHERE type = 'Saída' AND date >= ?", [startDateStr])[0]?.values[0][0] as number) || 0;
    const balance = (db.exec("SELECT SUM(currentBalance) FROM accounts")[0]?.values[0][0] as number) || 0;
    
    // Simple previous balance (start of period)
    const prevBalance = balance - (income - expense);
    setTotals({ income, expense, balance, previousBalance: prevBalance });

    // Recent Transactions
    const recentResult = db.exec(`
      SELECT t.*, c.name as categoryName 
      FROM transactions t 
      LEFT JOIN categories c ON t.categoryId = c.id 
      ORDER BY t.date DESC, t.id DESC LIMIT 5
    `);
    setRecentTransactions(recentResult.length > 0 ? recentResult[0].values.map(r => ({ id: r[0], date: r[1], value: r[2], description: r[3], type: r[4], categoryName: r[11] })) : []);

    // Allocation Data (By Account)
    const accResult = db.exec("SELECT name, currentBalance FROM accounts WHERE currentBalance > 0");
    if (accResult.length > 0) {
      setAllocationData(accResult[0].values.map(r => ({ name: r[0], value: r[1] })));
    }

    // Growth Data (Last 6 Months)
    const growth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.toLocaleString('default', { month: 'short' });
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const mBalance = (db.exec("SELECT SUM(value) FROM transactions WHERE type = 'Entrada' AND date <= ?", [lastDay])[0]?.values[0][0] as number || 0) -
                       (db.exec("SELECT SUM(value) FROM transactions WHERE type = 'Saída' AND date <= ?", [lastDay])[0]?.values[0][0] as number || 0);
      growth.push({ name: m, value: mBalance });
    }
    setGrowthData(growth);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const percentageChange = totals.previousBalance === 0 ? 0 : ((totals.balance - totals.previousBalance) / Math.abs(totals.previousBalance)) * 100;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta, {entityName || 'usuário'}</h1>
          <p className="text-muted-foreground mt-1">Visão Geral — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 glass-panel p-1.5 rounded-xl border-white/5 shadow-inner">
          <CalendarDays className="h-4 w-4 ml-2 text-primary" />
          <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
            <SelectTrigger className="w-[160px] border-none shadow-none focus:ring-0 bg-transparent font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-panel border-none">
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="semester">Este Semestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Balance Card */}
        <Card className="glass-card border-none overflow-hidden relative p-8 flex flex-col justify-between min-h-[240px]">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Patrimônio Total</p>
            <h2 className="text-4xl font-extrabold mt-4 tracking-tighter">{formatCurrency(totals.balance)}</h2>
            <div className={cn("flex items-center gap-1 mt-3 text-sm font-bold", percentageChange >= 0 ? "text-emerald-500" : "text-red-500")}>
              {percentageChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}% (período)
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <div className="w-24 h-24 bg-primary rounded-full blur-2xl" />
          </div>
          <Wallet className="absolute -right-4 -bottom-4 h-32 w-32 text-primary/5" />
        </Card>

        {/* Allocation Card */}
        <Card className="glass-card border-none p-6 flex flex-col justify-between min-h-[240px]">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">Alocação de Contas</h3>
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                  {allocationData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Total</span>
              <span className="text-sm font-bold">{formatCurrency(totals.balance)}</span>
            </div>
          </div>
        </Card>

        {/* Growth Card */}
        <Card className="glass-card border-none p-6 flex flex-col justify-between min-h-[240px]">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Crescimento Patrimonial</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsla(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsla(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="hsla(var(--primary))" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Transactions Table Section */}
      <Card className="glass-card border-none p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold">Transações Recentes</h3>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">Ver tudo</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-4 font-semibold">Data</th>
                <th className="pb-4 font-semibold">Descrição</th>
                <th className="pb-4 font-semibold">Categoria</th>
                <th className="pb-4 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map((t) => (
                <tr key={t.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 text-sm font-medium">{new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</td>
                  <td className="py-4 text-sm">{t.description || 'Sem descrição'}</td>
                  <td className="py-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-secondary text-secondary-foreground">{t.categoryName}</span>
                  </td>
                  <td className={cn("py-4 text-sm font-bold text-right", t.type === 'Entrada' ? 'text-emerald-500' : 'text-red-500')}>
                    {t.type === 'Entrada' ? '+' : '-'}{formatCurrency(t.value)}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground italic text-sm">Nenhuma transação registrada no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
