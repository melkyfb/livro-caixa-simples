import { useState, useEffect } from 'react';
import { getDatabase } from '@/lib/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpCircle, ArrowDownCircle, Wallet, CalendarDays } from 'lucide-react';

type Period = 'month' | 'quarter' | 'semester' | 'year';

export const DashboardView = () => {
  const [period, setPeriod] = useState<Period>('month');
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    const db = await getDatabase();
    
    // Calcular datas baseadas no período
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'month') {
      startDate.setDate(1);
    } else if (period === 'quarter') {
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      startDate.setMonth(quarterStartMonth, 1);
    } else if (period === 'semester') {
      const currentMonth = now.getMonth();
      const semesterStartMonth = currentMonth < 6 ? 0 : 6;
      startDate.setMonth(semesterStartMonth, 1);
    } else if (period === 'year') {
      startDate.setMonth(0, 1);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];

    // Calcular Entradas no período
    const incomeResult = db.exec("SELECT SUM(value) FROM transactions WHERE type = 'Entrada' AND date >= ?", [startDateStr]);
    const income = incomeResult[0]?.values[0][0] as number || 0;

    // Calcular Saídas no período
    const expenseResult = db.exec("SELECT SUM(value) FROM transactions WHERE type = 'Saída' AND date >= ?", [startDateStr]);
    const expense = expenseResult[0]?.values[0][0] as number || 0;

    // Saldo total das contas (sempre o atual)
    const balanceResult = db.exec("SELECT SUM(currentBalance) FROM accounts");
    const balance = balanceResult[0]?.values[0][0] as number || 0;

    setTotals({ income, expense, balance });

    // Transações recentes
    const recentResult = db.exec(`
      SELECT t.*, c.name as categoryName 
      FROM transactions t 
      LEFT JOIN categories c ON t.categoryId = c.id 
      ORDER BY t.date DESC, t.id DESC LIMIT 5
    `);
    if (recentResult.length > 0) {
      setRecentTransactions(recentResult[0].values.map(r => ({ id: r[0], date: r[1], value: r[2], description: r[3], type: r[4], categoryName: r[11] })));
    } else {
      setRecentTransactions([]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-2xl font-bold">Visão Geral</h3>
        <div className="flex items-center gap-2 bg-card border p-1 rounded-md">
          <CalendarDays className="h-4 w-4 ml-2 text-muted-foreground" />
          <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="semester">Este Semestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500 overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entradas ({period === 'month' ? 'Mês' : period})</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totals.income)}</p>
            <ArrowUpCircle className="absolute -right-2 -bottom-2 h-16 w-16 text-green-500 opacity-5" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saídas ({period === 'month' ? 'Mês' : period})</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(totals.expense)}</p>
            <ArrowDownCircle className="absolute -right-2 -bottom-2 h-16 w-16 text-red-500 opacity-5" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 overflow-hidden relative">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patrimônio Total</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(totals.balance)}</p>
            <Wallet className="absolute -right-2 -bottom-2 h-16 w-16 text-blue-500 opacity-5" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhuma transação registrada.</p>
              ) : (
                recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.description || t.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className={`text-sm font-bold ${t.type === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'Entrada' ? '+' : '-'}{formatCurrency(t.value)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dicas & Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Dica:</strong> Você pode adicionar categorias personalizadas na aba de Contas para detalhar melhor seus gastos.
              </p>
            </div>
            {totals.expense > totals.income && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-md">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Atenção:</strong> Suas saídas estão maiores que as entradas neste período. Revise seus lançamentos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
