import React, { useState, useEffect } from 'react';

interface Company {
  id: string;
  name: string;
  industry?: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface CompanySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompany: (company: Omit<Company, 'id'>) => void;
  companies: Company[];
}

export const CompanySidebar: React.FC<CompanySidebarProps> = ({ isOpen, onClose, onAddCompany, companies }) => {
  const [form, setForm] = useState<Omit<Company, 'id'>>({ name: '', industry: '', address: '', email: '', phone: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim()) {
      onAddCompany(form);
      setForm({ name: '', industry: '', address: '', email: '', phone: '' });
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full w-[400px] bg-white dark:bg-gray-900 shadow-xl z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ boxShadow: '2px 0 16px 0 rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold">Companies</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-2xl">&times;</button>
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Company Name" className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" required />
        <input name="industry" value={form.industry} onChange={handleChange} placeholder="Industry" className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" />
        <input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Add Company</button>
      </form>
      <div className="overflow-y-auto p-4 h-[calc(100%-200px)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-gray-700">
              <th className="py-2">Name</th>
              <th className="py-2">Industry</th>
              <th className="py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <td className="py-2 font-medium">{c.name}</td>
                <td className="py-2">{c.industry}</td>
                <td className="py-2">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
