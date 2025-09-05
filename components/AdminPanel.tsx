import React, { useEffect, useState } from 'react';
import { API_URL } from '../hooks/useCrmData';

// Helper to get user info from localStorage JWT (assumes payload is base64-encoded JSON)
function getUserFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch { return null; }
}

// Tab names
const TABS = ['Team Members', 'Users', 'Products', 'Templates'];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminPanel() {
  const [tab, setTab] = useState('Team Members');
  const [isAdmin, setIsAdmin] = useState(false);
  // Team Members state
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<any | null>(null);
  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any | null>(null);
  // User CRUD handlers
  async function saveUser(data: any) {
    setLoading(true);
    setError(null);
    try {
      const method = editUser ? 'PUT' : 'POST';
      const url = editUser ? `${API_URL}/api/users/${editUser.id}` : `${API_URL}/api/users`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowUserModal(false); setEditUser(null);
      // Refresh
      const updated = await fetch(`${API_URL}/api/users`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } }).then(r => r.json());
      setUsers(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function deleteUser(id: string) {
    if (!window.confirm('Delete this user?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' }
      });
      setUsers(users.filter(u => u.id !== id));
    } finally {
      setLoading(false);
    }
  }

  // Product CRUD handlers
  async function saveProduct(data: any) {
    setLoading(true);
    setError(null);
    try {
      const method = editProduct ? 'PUT' : 'POST';
      const url = editProduct ? `${API_URL}/api/products/${editProduct.id || editProduct.key}` : `${API_URL}/api/products`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowProductModal(false); setEditProduct(null);
      // Refresh
      const updated = await fetch(`${API_URL}/api/products`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } }).then(r => r.json());
      setProducts(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function deleteProduct(id: string) {
    if (!window.confirm('Delete this product?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' }
      });
      setProducts(products.filter(p => (p.id || p.key) !== id));
    } finally {
      setLoading(false);
    }
  }

  // Template CRUD handlers
  async function saveTemplate(data: any) {
    setLoading(true);
    setError(null);
    try {
      const method = editTemplate ? 'PUT' : 'POST';
      const url = editTemplate ? `${API_URL}/api/templates/${editTemplate.id}` : `${API_URL}/api/templates`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowTemplateModal(false); setEditTemplate(null);
      // Refresh
      const updated = await fetch(`${API_URL}/api/templates`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } }).then(r => r.json());
      setTemplates(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function deleteTemplate(id: string) {
    if (!window.confirm('Delete this template?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' }
      });
      setTemplates(templates.filter(t => (t.id || t.name) !== id));
    } finally {
      setLoading(false);
    }
  }
// User modal
function UserModal({ user, onClose, onSave }: { user: any, onClose: () => void, onSave: (data: any) => void }) {
  const [first_name, setFirst] = useState(user?.first_name || '');
  const [last_name, setLast] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [is_admin, setIsAdmin] = useState(!!user?.is_admin);
  const [job_title, setJob] = useState(user?.job_title || '');
  const [password, setPassword] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{user ? 'Edit' : 'Add'} User</h3>
        <form onSubmit={e => { e.preventDefault(); onSave({ first_name, last_name, email, is_admin, job_title, ...(password ? { password } : {}) }); }}>
          <div className="mb-3">
            <label className="block text-sm mb-1">First Name</label>
            <input className="w-full border px-2 py-1 rounded" value={first_name} onChange={e => setFirst(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Last Name</label>
            <input className="w-full border px-2 py-1 rounded" value={last_name} onChange={e => setLast(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full border px-2 py-1 rounded" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Job Title</label>
            <input className="w-full border px-2 py-1 rounded" value={job_title} onChange={e => setJob(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Password {user ? '(leave blank to keep unchanged)' : ''}</label>
            <input className="w-full border px-2 py-1 rounded" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input type="checkbox" checked={is_admin} onChange={e => setIsAdmin(e.target.checked)} id="is_admin" />
            <label htmlFor="is_admin">Admin</label>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Product modal
function ProductModal({ product, onClose, onSave }: { product: any, onClose: () => void, onSave: (data: any) => void }) {
  const [key, setKey] = useState(product?.key || '');
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price || product?.unit_price || '');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{product ? 'Edit' : 'Add'} Product</h3>
        <form onSubmit={e => { e.preventDefault(); onSave({ key, name, price }); }}>
          <div className="mb-3">
            <label className="block text-sm mb-1">Key</label>
            <input className="w-full border px-2 py-1 rounded" value={key} onChange={e => setKey(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Name</label>
            <input className="w-full border px-2 py-1 rounded" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Price</label>
            <input className="w-full border px-2 py-1 rounded" type="number" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Template modal
function TemplateModal({ template, onClose, onSave }: { template: any, onClose: () => void, onSave: (data: any) => void }) {
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState(template?.type || '');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{template ? 'Edit' : 'Add'} Template</h3>
        <form onSubmit={e => { e.preventDefault(); onSave({ name, type }); }}>
          <div className="mb-3">
            <label className="block text-sm mb-1">Name</label>
            <input className="w-full border px-2 py-1 rounded" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Type</label>
            <input className="w-full border px-2 py-1 rounded" value={type} onChange={e => setType(e.target.value)} required />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

  // Check admin status on mount
  useEffect(() => {
    const user = getUserFromToken();
    setIsAdmin(!!user && (user.role === 'admin'));
  }, []);

  // Fetch team members
  useEffect(() => {
    if (tab !== 'Team Members') return;
    setLoading(true);
  fetch(`${API_URL}/api/team-members`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } })
      .then(r => r.json())
      .then(setTeam)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  // Fetch users (placeholder)
  useEffect(() => {
    if (tab !== 'Users') return;
    setLoading(true);
  fetch(`${API_URL}/api/users`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } })
      .then(r => r.json())
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  // Fetch products (placeholder)
  useEffect(() => {
    if (tab !== 'Products') return;
    setLoading(true);
  fetch(`${API_URL}/api/products`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } })
      .then(r => r.json())
      .then(setProducts)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  // Fetch templates (placeholder)
  useEffect(() => {
    if (tab !== 'Templates') return;
    setLoading(true);
  fetch(`${API_URL}/api/templates`, { headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' } })
      .then(r => r.json())
      .then(setTemplates)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab]);

  // Add/Edit modal handlers (team members)
  function openAdd() {
    setEditMember(null);
    setShowModal(true);
  }
  function openEdit(member: any) {
    setEditMember(member);
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setEditMember(null);
  }

  // Save member (add or edit)
  async function saveMember(data: any) {
    setLoading(true);
    setError(null);
    try {
      const method = editMember ? 'PUT' : 'POST';
      const url = editMember ? `${API_URL}/api/team-members/${editMember.id}` : `${API_URL}/api/team-members`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save');
      closeModal();
      // Refresh
      const updated = await fetch(`${API_URL}/api/team-members`).then(r => r.json());
      setTeam(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Delete member
  async function deleteMember(id: string) {
    if (!window.confirm('Delete this team member?')) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/team-members/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' }
      });
      setTeam(team.filter(m => m.id !== id));
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return <div className="max-w-2xl mx-auto mt-20 p-8 bg-white dark:bg-gray-900 rounded shadow text-center text-red-600 font-semibold">Access denied: Admins only</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="flex gap-4 mb-6 border-b">
        {TABS.map(t => (
          <button key={t} className={classNames('py-2 px-4 -mb-px border-b-2', tab === t ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Team Members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={openAdd}>Add</button>
          </div>
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">First Name</th>
                <th className="p-2 border">Last Name</th>
                <th className="p-2 border">Initials</th>
                <th className="p-2 border">Job Title</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map(m => (
                <tr key={m.id}>
                  <td className="p-2 border">{m.first_name}</td>
                  <td className="p-2 border">{m.last_name}</td>
                  <td className="p-2 border">{m.initials}</td>
                  <td className="p-2 border">{m.job_title}</td>
                  <td className="p-2 border">
                    <button className="text-blue-600 mr-2" onClick={() => openEdit(m)}>Edit</button>
                    <button className="text-red-600" onClick={() => deleteMember(m.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {team.length === 0 && !loading && <tr><td colSpan={5} className="p-2 text-center">No team members</td></tr>}
            </tbody>
          </table>
          {showModal && <TeamMemberModal member={editMember} onClose={closeModal} onSave={saveMember} />}
        </div>
      )}
      {tab === 'Users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Users</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowUserModal(true)}>Add</button>
          </div>
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-2 border">{u.name || `${u.first_name || ''} ${u.last_name || ''}`}</td>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border">{u.role || (u.is_admin ? 'Admin' : 'User')}</td>
                  <td className="p-2 border">
                    <button className="text-blue-600 mr-2" onClick={() => { setEditUser(u); setShowUserModal(true); }}>Edit</button>
                    <button className="text-red-600" onClick={() => deleteUser(u.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && <tr><td colSpan={4} className="p-2 text-center">No users</td></tr>}
            </tbody>
          </table>
          {showUserModal && <UserModal user={editUser} onClose={() => { setShowUserModal(false); setEditUser(null); }} onSave={saveUser} />}
        </div>
      )}
      {tab === 'Products' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Products</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowProductModal(true)}>Add</button>
          </div>
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">Key</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Price</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.key || p.id}>
                  <td className="p-2 border">{p.key || p.id}</td>
                  <td className="p-2 border">{p.name}</td>
                  <td className="p-2 border">{p.price || p.unit_price || ''}</td>
                  <td className="p-2 border">
                    <button className="text-blue-600 mr-2" onClick={() => { setEditProduct(p); setShowProductModal(true); }}>Edit</button>
                    <button className="text-red-600" onClick={() => deleteProduct(p.id || p.key)}>Delete</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !loading && <tr><td colSpan={4} className="p-2 text-center">No products</td></tr>}
            </tbody>
          </table>
          {showProductModal && <ProductModal product={editProduct} onClose={() => { setShowProductModal(false); setEditProduct(null); }} onSave={saveProduct} />}
        </div>
      )}
      {tab === 'Templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Templates</h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowTemplateModal(true)}>Add</button>
          </div>
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id || t.name}>
                  <td className="p-2 border">{t.name}</td>
                  <td className="p-2 border">{t.type || ''}</td>
                  <td className="p-2 border">
                    <button className="text-blue-600 mr-2" onClick={() => { setEditTemplate(t); setShowTemplateModal(true); }}>Edit</button>
                    <button className="text-red-600" onClick={() => deleteTemplate(t.id || t.name)}>Delete</button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && !loading && <tr><td colSpan={3} className="p-2 text-center">No templates</td></tr>}
            </tbody>
          </table>
          {showTemplateModal && <TemplateModal template={editTemplate} onClose={() => { setShowTemplateModal(false); setEditTemplate(null); }} onSave={saveTemplate} />}
        </div>
      )}
    </div>
  );
}

// Modal for add/edit team member
function TeamMemberModal({ member, onClose, onSave }: { member: any, onClose: () => void, onSave: (data: any) => void }) {
  const [first_name, setFirst] = useState(member?.first_name || '');
  const [last_name, setLast] = useState(member?.last_name || '');
  const [initials, setInitials] = useState(member?.initials || '');
  const [job_title, setJob] = useState(member?.job_title || '');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">{member ? 'Edit' : 'Add'} Team Member</h3>
        <form onSubmit={e => { e.preventDefault(); onSave({ first_name, last_name, initials, job_title }); }}>
          <div className="mb-3">
            <label className="block text-sm mb-1">First Name</label>
            <input className="w-full border px-2 py-1 rounded" value={first_name} onChange={e => setFirst(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Last Name</label>
            <input className="w-full border px-2 py-1 rounded" value={last_name} onChange={e => setLast(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Initials</label>
            <input className="w-full border px-2 py-1 rounded" value={initials} onChange={e => setInitials(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Job Title</label>
            <input className="w-full border px-2 py-1 rounded" value={job_title} onChange={e => setJob(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
