import { enumLabel } from '@/lib/i18n';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Package, Truck } from 'lucide-react';
import type { Paginated, WarehouseItem, WarehouseTransaction } from '@/api/types';

export function WarehousePage() {
  const { currentProject, language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('items');

  const [showTxForm, setShowTxForm] = useState(false);
  const [txMaterialId, setTxMaterialId] = useState('');
  const [txType, setTxType] = useState('INCOMING');
  const [txQty, setTxQty] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txUnitId, setTxUnitId] = useState('');

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WarehouseTransaction[]>([]);

  const projectId = currentProject?.id;

  const loadItems = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId, page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get<Paginated<WarehouseItem>>(`/warehouse?${params}`);
      setItems(res.items || []);
    } catch { /* keep */ }
    setLoading(false);
  }, [projectId, page, search]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function loadTransactions(itemId: string) {
    setSelectedItemId(prev => prev === itemId ? null : itemId);
    if (selectedItemId === itemId || !projectId) return;
    try {
      const res = await api.get<Paginated<WarehouseTransaction>>(`/warehouse-transactions?projectId=${projectId}&materialId=${itemId}`);
      setTransactions(res.items || []);
    } catch { setTransactions([]); }
  }

  async function handleCreateTx() {
    if (!txMaterialId || !txQty || !projectId) return;
    try {
      await api.post('/warehouse-transactions/create', {
        projectId, materialId: txMaterialId, type: txType,
        quantity: parseFloat(txQty), unitId: txUnitId || undefined, notes: txNotes,
      });
      setShowTxForm(false);
      setTxMaterialId(''); setTxQty(''); setTxNotes(''); setTxUnitId('');
      loadItems();
    } catch { alert(t('Failed to create transaction')); }
  }

  async function handleConfirm(txId: string) {
    try {
      await api.post(`/warehouse-transactions/${txId}/confirm`, { confirmedQuantity: 0 });
      loadItems();
      if (selectedItemId) loadTransactions(selectedItemId);
    } catch { alert(t('Failed to confirm')); }
  }

  async function handleReject(txId: string) {
    try {
      await api.post(`/warehouse-transactions/${txId}/reject`, {});
      loadItems();
      if (selectedItemId) loadTransactions(selectedItemId);
    } catch { alert(t('Failed to reject')); }
  }

  const filtered = items.filter((i) =>
    !search || i.material?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('Material stock and transaction management')}</p>
        <Button onClick={() => setShowTxForm(true)}>
          <Truck className="w-4 h-4 mr-2" /> {t('New Transaction')}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Stock Items')}</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Pending Confirmations')}</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <Card>
            <div className="p-4 border-b border-border">
              <Input placeholder={t('Search materials...')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Material')}</TableHead>
                  <TableHead>{t('Unit')}</TableHead>
                  <TableHead className="text-right">{t('Balance')}</TableHead>
                  <TableHead className="text-right">{t('Reserved')}</TableHead>
                  <TableHead className="text-right">{t('Available')}</TableHead>
                  <TableHead className="text-right">{t('Planned')}</TableHead>
                  <TableHead className="text-right">{t('Used')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <>
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30" onClick={() => loadTransactions(item.materialId)}>
                      <TableCell className="font-medium">{item.material?.name || item.materialId}</TableCell>
                      <TableCell className="text-muted-foreground">{item.material?.defaultUnit?.code || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{item.currentBalance}</TableCell>
                      <TableCell className="text-right">{item.reservedQuantity || 0}</TableCell>
                      <TableCell className="text-right">{item.availableQuantity || item.currentBalance}</TableCell>
                      <TableCell className="text-right">{item.plannedTotal || 0}</TableCell>
                      <TableCell className="text-right">{item.usedQuantity || 0}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'LOW' ? 'warning' : item.status === 'OUT' ? 'danger' : 'success'}>
                          {enumLabel(item.status || 'NORMAL', language)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {selectedItemId === item.materialId && transactions.length > 0 && (
                      <TableRow key={`${item.id}-tx`}>
                        <TableCell colSpan={8} className="p-0">
                          <div className="bg-muted/20 p-4">
                            <p className="text-xs font-medium mb-2 text-muted-foreground">{t('Transaction History')} ({transactions.length})</p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t('Date')}</TableHead>
                                  <TableHead>{t('Type')}</TableHead>
                                  <TableHead className="text-right">{t('Qty')}</TableHead>
                                  <TableHead>{t('Status')}</TableHead>
                                  <TableHead className="w-24"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transactions.map((t) => (
                                  <TableRow key={t.id}>
                                    <TableCell className="text-xs">{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
                                    <TableCell><Badge variant="secondary">{enumLabel(t.type, language)}</Badge></TableCell>
                                    <TableCell className="text-right">{t.quantity}</TableCell>
                                    <TableCell>
                                      <Badge variant={t.status === 'CONFIRMED' ? 'success' : t.status === 'PENDING' ? 'warning' : 'danger'}>
                                        {t.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {t.status === 'PENDING' && (
                                        <div className="flex gap-1">
                                          <button onClick={() => handleConfirm(t.id)} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <button onClick={() => handleReject(t.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t('No warehouse items')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t border-border text-sm text-muted-foreground">
              <span>{t('Page')} {page}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Prev')}</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <PendingConfirmations projectId={projectId} />
        </TabsContent>
      </Tabs>

      <Dialog open={showTxForm} onOpenChange={setShowTxForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Create Transaction')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={txMaterialId} onChange={(e) => setTxMaterialId(e.target.value)} placeholder={t('Material ID *')} />
            <Select value={txType} onChange={(e) => setTxType(e.target.value)}>
              <option value="INCOMING">{t('Incoming')}</option>
              <option value="OUTGOING">{t('Outgoing')}</option>
              <option value="OPENING_BALANCE">{t('Opening Balance')}</option>
              <option value="RETURN">{t('Return')}</option>
              <option value="ADJUSTMENT">{t('Adjustment')}</option>
            </Select>
            <Input type="number" value={txQty} onChange={(e) => setTxQty(e.target.value)} placeholder={t('Quantity *')} />
            <Input value={txUnitId} onChange={(e) => setTxUnitId(e.target.value)} placeholder={t('Unit ID')} />
            <Input value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder={t('Notes')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxForm(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreateTx}>{t('Create Transaction')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingConfirmations({ projectId }: { projectId: string | undefined }) {
  const { language, t } = useApp();
  const [pending, setPending] = useState<WarehouseTransaction[]>([]);

  useEffect(() => {
    if (!projectId) return;
    api.get<Paginated<WarehouseTransaction>>(`/warehouse-transactions?projectId=${projectId}&status=PENDING`)
      .then((res) => setPending(res.items || []))
      .catch(() => setPending([]));
  }, [projectId]);

  if (pending.length === 0) {
    return <div className="text-center py-12 text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>{t('No pending transactions')}</p></div>;
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Date')}</TableHead>
            <TableHead>{t('Type')}</TableHead>
            <TableHead className="text-right">{t('Qty')}</TableHead>
            <TableHead>{t('Status')}</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-xs">{new Date(t.transactionDate).toLocaleDateString()}</TableCell>
              <TableCell><Badge variant="secondary">{enumLabel(t.type, language)}</Badge></TableCell>
              <TableCell className="text-right">{t.quantity}</TableCell>
              <TableCell><Badge variant="warning">{enumLabel('PENDING', language)}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <button onClick={async () => {
                    await api.post(`/warehouse-transactions/${t.id}/confirm`, { confirmedQuantity: t.quantity });
                    window.location.reload();
                  }} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check className="w-4 h-4" /></button>
                  <button onClick={async () => {
                    await api.post(`/warehouse-transactions/${t.id}/reject`, {});
                    window.location.reload();
                  }} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><X className="w-4 h-4" /></button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
