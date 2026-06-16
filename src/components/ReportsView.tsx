import { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import type { SignatureField, CustomField } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, LayoutList, ListOrdered, CalendarDays, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ReportMode = 'overview' | 'detailed';

export const ReportsView = () => {
  const [period, setPeriod] = useState('month');
  const [reportMode, setReportMode] = useState<ReportMode>('overview');
  const [reportData, setReportData] = useState<any>({
    totals: { income: 0, expense: 0, balance: 0 },
    categories: [],
    transactions: [],
    settings: null,
    customFields: [],
    printConfig: { showSignatures: true, signatures: [] }
  });

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    try {
      const [accounts, categories, transactions, settings] = await Promise.all([
        apiService.getAccounts(),
        apiService.getCategories(),
        apiService.getTransactions(),
        apiService.getSettings().catch(() => null)
      ]);

      // Calcular datas
      const now = new Date();
      let startDate = new Date();
      if (period === 'month') startDate.setDate(1);
      else if (period === 'quarter') startDate.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
      else if (period === 'semester') startDate.setMonth(now.getMonth() < 6 ? 0 : 6, 1);
      else if (period === 'year') startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      const startTime = startDate.getTime();

      const filteredTransactions = transactions.filter((t: any) => new Date(t.date).getTime() >= startTime);

      const income = filteredTransactions
        .filter((t: any) => t.type === 'Entrada')
        .reduce((sum: number, t: any) => sum + t.value, 0);
        
      const expense = filteredTransactions
        .filter((t: any) => t.type === 'Saída')
        .reduce((sum: number, t: any) => sum + t.value, 0);

      const reportCategories = categories.map((c: any) => ({
        name: c.name,
        type: c.type,
        total: filteredTransactions
          .filter((t: any) => t.category_id === c.id)
          .reduce((sum: number, t: any) => sum + t.value, 0)
      })).filter((c: any) => c.total > 0);

      const reportTransactions = filteredTransactions.map((t: any) => ({
        date: t.date,
        description: t.description,
        category: categories.find((c: any) => c.id === t.category_id)?.name,
        account: accounts.find((a: any) => a.id === t.account_id)?.name,
        value: t.value,
        type: t.type
      }));

      let customFields = [];
      let printConfig = { showSignatures: true, signatures: [] };

      if (settings) {
        try { customFields = JSON.parse(settings.customFieldsSchema || '[]'); } catch(e) {}
        try { printConfig = JSON.parse(settings.printSettings || '{"showSignatures": true, "signatures": []}'); } catch(e) {}
      }

      setReportData({ 
        totals: { income, expense, balance: income - expense }, 
        categories: reportCategories, 
        transactions: reportTransactions, 
        settings, 
        customFields, 
        printConfig 
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    const currency = reportData.settings?.currency || 'BRL';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: currency 
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Controles do Relatório */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h3 className="text-2xl font-bold">Relatórios Profissionais</h3>
          <p className="text-xs text-muted-foreground mt-1">Gere documentos prontos para impressão ou arquivamento.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={reportMode} onValueChange={(v) => setReportMode(v as ReportMode)}>
            <TabsList>
              <TabsTrigger value="overview" className="flex gap-2">
                <LayoutList className="h-4 w-4" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="detailed" className="flex gap-2">
                <ListOrdered className="h-4 w-4" /> Detalhado
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
              <SelectItem value="semester">Semestral</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* DOCUMENTO DE IMPRESSÃO */}
      <div className="bg-white border rounded-xl shadow-lg p-10 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none">
        
        {/* Cabeçalho Profissional */}
        <header className="flex justify-between items-start border-b-2 border-primary pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-primary uppercase tracking-tighter leading-none mb-1">
              {reportData.settings?.entity_name || 'LIVRO CAIXA'}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3 w-3" /> {reportData.settings?.entity_type} • {reportData.settings?.country}
            </p>
            
            {/* Campos Customizados da Entidade (Endereço, etc) */}
            <div className="mt-3 grid grid-cols-1 gap-1">
              {reportData.customFields.map((field: CustomField, i: number) => (
                <p key={i} className="text-[10px] text-muted-foreground leading-none">
                  <span className="font-bold uppercase">{field.label}:</span> {field.value}
                </p>
              ))}
            </div>
          </div>
          
          <div className="text-right">
            <div className="bg-primary text-primary-foreground px-4 py-1 rounded text-xs font-black uppercase mb-2">
              Relatório Financeiro
            </div>
            <p className="text-sm font-bold capitalize">{period === 'month' ? 'Mensal' : period === 'year' ? 'Anual' : period}</p>
            <p className="text-[10px] text-muted-foreground italic mt-1">Gerado em {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </header>

        {/* Dash de Totais */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-secondary/20 p-4 rounded-lg border-l-4 border-l-green-500">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Entradas</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(reportData.totals.income)}</p>
          </div>
          <div className="bg-secondary/20 p-4 rounded-lg border-l-4 border-l-red-500">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Saídas</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(reportData.totals.expense)}</p>
          </div>
          <div className={cn(
            "p-4 rounded-lg border-l-4",
            reportData.totals.balance >= 0 ? "bg-secondary/20 border-l-blue-500" : "bg-orange-50 border-l-orange-500"
          )}>
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Saldo do Período</p>
            <p className={cn(
              "text-xl font-bold",
              reportData.totals.balance >= 0 ? "text-blue-700" : "text-orange-700"
            )}>
              {formatCurrency(reportData.totals.balance)}
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {/* VISÃO GERAL: Resumo por Categoria */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <LayoutList className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-black uppercase tracking-widest text-primary">Resumo das Operações</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-10">
              {/* Entradas Grouped */}
              <div>
                <p className="text-[10px] font-black text-green-600 mb-3 border-b-2 border-green-100 pb-1 uppercase">Entradas por Categoria</p>
                <div className="space-y-2">
                  {reportData.categories.filter((c:any) => c.type === 'Entrada').map((c:any, i:number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{c.name}</span>
                      <div className="flex-1 mx-2 border-b border-dotted" />
                      <span className="font-bold">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                  {reportData.categories.filter((c:any) => c.type === 'Entrada').length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">Nenhuma entrada no período.</p>
                  )}
                </div>
              </div>

              {/* Saídas Grouped */}
              <div>
                <p className="text-[10px] font-black text-red-600 mb-3 border-b-2 border-red-100 pb-1 uppercase">Saídas por Categoria</p>
                <div className="space-y-2">
                  {reportData.categories.filter((c:any) => c.type === 'Saída').map((c:any, i:number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{c.name}</span>
                      <div className="flex-1 mx-2 border-b border-dotted" />
                      <span className="font-bold">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                  {reportData.categories.filter((c:any) => c.type === 'Saída').length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">Nenhuma saída no período.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* VISÃO DETALHADA: Transações Itemizadas (Opcional) */}
          {reportMode === 'detailed' && (
            <section className="print:break-before-page">
              <div className="flex items-center gap-2 mb-4">
                <ListOrdered className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-primary">Detalhamento dos Lançamentos</h4>
              </div>
              
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-2 border text-left">DATA</th>
                    <th className="p-2 border text-left">DESCRIÇÃO / HISTÓRICO</th>
                    <th className="p-2 border text-left">CATEGORIA</th>
                    <th className="p-2 border text-left">CONTA</th>
                    <th className="p-2 border text-right">VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.transactions.map((t:any, i:number) => (
                    <tr key={i} className={cn(
                      "border-b",
                      i % 2 === 0 ? "bg-white" : "bg-secondary/5"
                    )}>
                      <td className="p-2 border-x">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-2 border-x font-medium">{t.description || '-'}</td>
                      <td className="p-2 border-x text-muted-foreground">{t.category}</td>
                      <td className="p-2 border-x text-muted-foreground">{t.account}</td>
                      <td className={cn(
                        "p-2 border-x text-right font-bold",
                        t.type === 'Entrada' ? "text-green-600" : "text-red-600"
                      )}>
                        {t.type === 'Saída' ? '-' : ''}{formatCurrency(t.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* Rodapé de Assinaturas Customizado */}
        {reportData.printConfig?.showSignatures && (
          <div className="mt-20 print:mt-32">
            <div className="grid grid-cols-2 gap-y-16 gap-x-20">
              {reportData.printConfig.signatures.map((sig: SignatureField, i: number) => (
                <div key={i} className="text-center">
                  <div className="border-t border-black mb-1 mx-auto w-full" />
                  <p className="text-[10px] font-black uppercase leading-none">{sig.label || 'Assinatura'}</p>
                  {sig.name && <p className="text-[9px] text-muted-foreground mt-1">{sig.name}</p>}
                </div>
              ))}
              
              {/* Se for ímpar, adiciona um espaço vazio ou campo padrão se não houver nenhum */}
              {reportData.printConfig.signatures.length === 0 && (
                <>
                  <div className="text-center"><div className="border-t border-black w-full" /><p className="text-[10px] font-black uppercase mt-1">Responsável</p></div>
                  <div className="text-center"><div className="border-t border-black w-full" /><p className="text-[10px] font-black uppercase mt-1">Conferido por</p></div>
                </>
              )}
            </div>
            
            <p className="text-center text-[8px] text-muted-foreground mt-16 italic">
              Este documento foi gerado pelo sistema Livro Caixa Simples em {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 15mm; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:break-before-page { break-before: page; margin-top: 2rem; }
        }
      `}} />
    </div>
  );
};
