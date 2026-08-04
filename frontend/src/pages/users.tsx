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
import { Trash2, UserPlus } from 'lucide-react';
import { roleLabel } from '@/lib/i18n';
import { errorMessage } from '@/services/api';
import type { Paginated, Role, UserListItem } from '@/api/types';

export function UsersPage() {
  const { user, language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PROAB');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [createError, setCreateError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get<Paginated<UserListItem>>(`/users?${params}`);
      setUsers(res.items || []);
      setTotal(res.total || 0);
    } catch { /* keep */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function handleCreate() {
    if (!fullName || !username || !password) return;
    setCreateError('');
    try {
      await api.post('/users', { fullName, username, password, role, email: email || undefined, phone: phone || undefined });
      setShowCreate(false);
      setFullName(''); setUsername(''); setPassword(''); setEmail(''); setPhone(''); setRole('PROAB');
      loadUsers();
    } catch (e: unknown) { setCreateError(errorMessage(e, t('Failed to create user'))); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('Delete this user?'))) return;
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch { alert(t('Failed to delete user')); }
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t('Access denied')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('Manage system users and roles')}</p>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> {t('Add User')}
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-border flex gap-4 items-center">
          <Input placeholder={t('Search users...')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <span className="text-sm text-muted-foreground">{total} {t('total users')}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name')}</TableHead>
              <TableHead>{t('Username')}</TableHead>
              <TableHead>{t('Email')}</TableHead>
              <TableHead>{t('Role')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell className="text-muted-foreground">{u.email || '-'}</TableCell>
                <TableCell><Badge variant={u.role === 'ADMIN' ? 'info' : 'default'}>{roleLabel(u.role, language)}</Badge></TableCell>
                <TableCell><Badge variant={u.status === 'ACTIVE' ? 'success' : 'warning'}>{u.status}</Badge></TableCell>
                <TableCell>
                  <button onClick={() => handleDelete(u.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('No users found')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-4 border-t border-border">
          <span className="text-sm text-muted-foreground">{t('Page')} {page}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Prev')}</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
          </div>
        </div>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Create User')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('Full Name')} />
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('Username')} />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('Password (min 6 chars)')} />
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="PROAB">{roleLabel('PROAB', language)}</option>
              <option value="ADMIN">{roleLabel('ADMIN', language)}</option>
            </Select>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('Email (optional)')} />
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('Phone (optional)')} />
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreate}>{t('Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
