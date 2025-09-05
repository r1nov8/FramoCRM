import React, { useState } from 'react';

// Placeholder types, update as needed
export interface CustomerContact {
  id: number;
  name: string;
  companyId: number;
  companyName: string;
  jobTitle?: string;
  email?: string;
  phoneNumber?: string;
}

interface ContactsPageProps {
  // In a real app, fetch these from API/context
  contacts?: CustomerContact[];
  companies?: { id: number; name: string }[];
}


export const ContactsPage: React.FC<ContactsPageProps> = ({ contacts = [], companies = [] }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<CustomerContact>>({});
  const [contactList, setContactList] = useState<CustomerContact[]>(contacts);

  const startEdit = (contact: CustomerContact) => {
    setEditingId(contact.id);
    setForm(contact);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };
  const saveContact = () => {
    if (!form.name || !form.companyId) return;
    if (editingId) {
      setContactList(list => list.map(c => c.id === editingId ? { ...c, ...form } as CustomerContact : c));
    } else {
      setContactList(list => [...list, { ...form, id: Date.now(), companyName: companies.find(c => c.id === form.companyId)?.name || '' } as CustomerContact]);
    }
    cancelEdit();
  };
  const deleteContact = (id: number) => {
    setContactList(list => list.filter(c => c.id !== id));
    if (editingId === id) cancelEdit();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Customer Contacts</h1>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => { setEditingId(null); setForm({}); }}
        >
          <span className="font-semibold text-lg">+</span> Add Contact
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Job Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {contactList.map(contact => (
              editingId === contact.id ? (
                <tr key={contact.id} className="bg-blue-50 dark:bg-gray-700/60">
                  <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></td>
                  <td className="px-4 py-2">
                    <select className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.companyId || ''} onChange={e => setForm(f => ({ ...f, companyId: Number(e.target.value) }))}>
                      <option value="">Select</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.jobTitle || ''} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.phoneNumber || ''} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} /></td>
                  <td className="px-4 py-2 flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={saveContact}>Save</button>
                    <button className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-700" onClick={cancelEdit}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                  <td className="px-4 py-2 font-medium">{contact.name}</td>
                  <td className="px-4 py-2">{contact.companyName}</td>
                  <td className="px-4 py-2">{contact.jobTitle}</td>
                  <td className="px-4 py-2">{contact.email}</td>
                  <td className="px-4 py-2">{contact.phoneNumber}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => startEdit(contact)}>Edit</button>
                    <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => deleteContact(contact.id)}>Delete</button>
                  </td>
                </tr>
              )
            ))}
            {editingId === null && (
              <tr className="bg-blue-50 dark:bg-gray-700/60">
                <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></td>
                <td className="px-4 py-2">
                  <select className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.companyId || ''} onChange={e => setForm(f => ({ ...f, companyId: Number(e.target.value) }))}>
                    <option value="">Select</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.jobTitle || ''} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></td>
                <td className="px-4 py-2"><input className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900" value={form.phoneNumber || ''} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} /></td>
                <td className="px-4 py-2 flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={saveContact}>Save</button>
                  <button className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-700" onClick={cancelEdit}>Cancel</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
