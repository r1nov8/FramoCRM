import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUpIcon, NewspaperIcon } from './icons';
import { API_URL } from '../hooks/useCrmData';

const Widget: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-700 dark:text-gray-300">
            {icon}
            <span className="ml-3">{title}</span>
        </h3>
        <div className="text-gray-600 dark:text-gray-400">
            {children}
        </div>
    </div>
);





interface DashboardProps {
    userFirstName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ userFirstName }) => {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pipeline, setPipeline] = useState<{ stage: string; count: number; total: number }[]>([]);
    const [leadsByStatus, setLeadsByStatus] = useState<{ status: string; count: number }[]>([]);
    const [projectsByMonth, setProjectsByMonth] = useState<{ month: string; count: number }[]>([]);

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
                setLoading(true);
                setError(null);
                const [pRes, cRes] = await Promise.all([
                    fetch(`${API_URL}/api/reports/pipeline-summary`),
                    fetch(`${API_URL}/api/reports/conversion`)
                ]);
                const pJson = await pRes.json().catch(() => ({ summary: [] }));
                const cJson = await cRes.json().catch(() => ({ leadsByStatus: [], projectsByMonth: [] }));
                if (!mounted) return;
                setPipeline(Array.isArray(pJson.summary) ? pJson.summary : []);
                setLeadsByStatus(Array.isArray(cJson.leadsByStatus) ? cJson.leadsByStatus : []);
                setProjectsByMonth(Array.isArray(cJson.projectsByMonth) ? cJson.projectsByMonth : []);
            } catch (e: any) {
                if (!mounted) return;
                setError(e?.message || 'Failed to load dashboard');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        run();
        return () => { mounted = false; };
    }, []);

    const totalOpenValue = useMemo(() => {
        try {
            return pipeline.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
        } catch { return 0; }
    }, [pipeline]);

    const maxMonthly = useMemo(() => {
        return projectsByMonth.reduce((m, r) => Math.max(m, r.count || 0), 0) || 1;
    }, [projectsByMonth]);

    return (
        <div className="space-y-6 mt-16 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {userFirstName}!</h1>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Here's a summary of your sales pipeline and latest updates.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto justify-center">
                <Widget icon={<TrendingUpIcon className="w-6 h-6" />} title="Pipeline Summary">
                    {loading && <p className="text-sm">Loading…</p>}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {!loading && !error && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Total Open Value</span>
                                <span className="font-semibold">{totalOpenValue.toLocaleString()}</span>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {pipeline.map((row) => (
                                    <div key={row.stage} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs rounded-full bg-blue-600 text-white">{row.count}</span>
                                            <span className="text-gray-700 dark:text-gray-300">{row.stage}</span>
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">{Number(row.total || 0).toLocaleString()}</div>
                                    </div>
                                ))}
                                {pipeline.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500">No data</div>
                                )}
                            </div>
                        </div>
                    )}
                </Widget>
                <Widget icon={<NewspaperIcon className="w-6 h-6" />} title="Conversion Trends">
                    {loading && <p className="text-sm">Loading…</p>}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {!loading && !error && (
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-gray-500 mb-2">Leads by Status</div>
                                <div className="flex flex-wrap gap-2">
                                    {leadsByStatus.map(ls => (
                                        <span key={ls.status} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">
                                            <span className="font-medium">{ls.status}</span>
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px]">{ls.count}</span>
                                        </span>
                                    ))}
                                    {leadsByStatus.length === 0 && <span className="text-sm text-gray-500">No leads yet</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-2">Projects Created (last 12 months)</div>
                                <div className="flex items-end gap-1 h-24">
                                    {projectsByMonth.map(p => {
                                        const h = Math.max(2, Math.round((p.count / maxMonthly) * 100));
                                        return (
                                            <div key={p.month} className="flex flex-col items-center">
                                                <div className="w-4 bg-blue-500/80" style={{ height: `${h}%` }} title={`${p.month}: ${p.count}`}></div>
                                                <div className="text-[10px] mt-1 text-gray-500">{p.month.slice(5)}</div>
                                            </div>
                                        );
                                    })}
                                    {projectsByMonth.length === 0 && <span className="text-sm text-gray-500">No recent projects</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </Widget>
            </div>
        </div>
    );
};
