import React, { useEffect, useMemo, useState } from 'react';
import type { Activity, TeamMember } from '../types';
import { useData } from '../context/DataContext';

export interface ActivitySlideOverProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  activities: Activity[];
}

export const ActivitySlideOver: React.FC<ActivitySlideOverProps> = ({ open, onClose, projectId, activities }) => {
  const { teamMembers, selectedProjectId, handleAddActivity, reloadActivitiesForProject } = useData();
  const [text, setText] = useState('');
  const currentUsername = useMemo(() => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return null;
      const parts = t.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload?.username || null;
    } catch { return null; }
  }, []);

  // Group into Today / This Week / Older (same logic as before)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(startOfToday.getDate() + (7 - startOfToday.getDay()));
  const groups: Record<string, Activity[]> = { Today: [], ThisWeek: [], Older: [] };
  for (const a of activities) {
    const d = new Date(a.createdAt);
    if (d >= startOfToday) groups.Today.push(a);
    else if (d < startOfToday && d <= endOfWeek) groups.ThisWeek.push(a);
    else groups.Older.push(a);
  }
  const order = ['Today', 'ThisWeek', 'Older'];

  const findMember = (id?: string | null): TeamMember | null => {
    if (!id) return null;
    return teamMembers.find(m => String(m.id) === String(id)) || null;
  };
  const toTitleCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

  const onSend = async () => {
    const content = text.trim();
    const pid = String(projectId || selectedProjectId || '');
    if (!content || !pid) return;
    try {
      await handleAddActivity(pid, { type: 'note', content });
      setText('');
      try { await reloadActivitiesForProject(pid); } catch {}
    } catch (e: any) {
      alert(e?.message || 'Failed to post comment');
    }
  };

  // Ensure activities are loaded whenever the panel opens
  useEffect(() => {
    const pid = String(projectId || selectedProjectId || '');
    if (open && pid) {
      try { reloadActivitiesForProject(pid); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, selectedProjectId]);

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
         aria-hidden={!open}
         role="dialog"
         aria-modal="true">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`absolute top-0 right-0 h-full w-full sm:w-[420px] md:w-[520px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-out
        ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Activity</h2>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close activity">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 pb-24">
            <div className="space-y-5">
              {order.map(col => (
                <div key={col}>
                  <div className="px-3 py-1 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 uppercase">{col === 'ThisWeek' ? 'This Week' : col}</div>
                  <div className="px-2 space-y-4">
                    {groups[col].length === 0 ? (
                      <p className="text-xs text-gray-500">No entries</p>
                    ) : groups[col].map(a => {
                      const you = currentUsername && a.createdByName && a.createdByName === currentUsername;
                      const member = findMember(a.createdBy || null);
                      const displayFirst = member?.first_name || toTitleCase(String(a.createdByName || '').split(/[\s@.]+/)[0] || '');
                      const initials = member?.initials || (displayFirst ? displayFirst.slice(0,2).toUpperCase() : '??');
                      return (
                        <div key={a.id} className={`flex ${you ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                          {!you && (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 select-none">
                              {initials}
                            </div>
                          )}
                          <div className={`max-w-[78%] ${you ? 'items-end text-right' : 'items-start'} flex flex-col`}>
                            <div className={`text-[11px] text-gray-500 dark:text-gray-400 mb-1 ${you ? 'self-end' : 'self-start'}`}>{displayFirst || 'Unknown'}</div>
                            <div className={`rounded-2xl px-3 py-2 shadow-sm border leading-relaxed ${you ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700'}`}>
                              <div className="text-xs mb-0.5 opacity-70 capitalize">{a.type.replace('_',' ')}</div>
                              <div className="text-sm whitespace-pre-wrap">{a.content}</div>
                            </div>
                          </div>
                          {you && (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs flex items-center justify-center flex-shrink-0 select-none">
                              {initials}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 border-t dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur sticky bottom-0">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e)=>setText(e.target.value)}
                onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
              />
              <button
                onClick={onSend}
                className="px-3 py-2 rounded-full bg-blue-600 text-white text-sm disabled:opacity-50"
                disabled={!text.trim()}
              >Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitySlideOver;
