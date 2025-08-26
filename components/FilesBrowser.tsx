import React, { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../hooks/useCrmData';

type FileItem = {
  name: string;
  isDir: boolean;
  size: number;
  mtime: number;
  relPath: string;
};


const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const tsToLocal = (ms: number) => new Date(ms).toLocaleString();

const breadcrumbParts = (relPath: string) => relPath.split('/').filter(Boolean);

const FilesBrowser: React.FC = () => {
  const [relPath, setRelPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [rootName, setRootName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ path: string; size: number; content: string } | null>(null);

  const token = useMemo(() => localStorage.getItem('token'), []);

  const fetchList = async (pathRel: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_URL}/api/files`);
      if (pathRel) url.searchParams.set('path', pathRel);
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setRootName(data.root || 'root');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (pathRel: string) => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const url = new URL(`${API_URL}/api/file`);
      url.searchParams.set('path', pathRel);
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setPreview(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(relPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relPath]);

  const crumbs = breadcrumbParts(relPath);

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
            <span className="font-semibold">{rootName}</span>
            {crumbs.length > 0 && <span className="mx-1">/</span>}
            {crumbs.map((c, idx) => (
              <span key={idx}>
                <button
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={() => setRelPath(crumbs.slice(0, idx + 1).join('/'))}
                >
                  {c}
                </button>
                {idx < crumbs.length - 1 && <span className="mx-1">/</span>}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => setRelPath(prev => prev.split('/').filter(Boolean).slice(0, -1).join('/'))}
              disabled={!relPath}
            >
              Up
            </button>
            <button
              className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => fetchList(relPath)}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-3 text-sm text-gray-500">Loading…</div>}
          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400">
              {error.includes('Cannot GET') || error.includes('Not Found')
                ? 'Files feature disabled on server.'
                : error}
            </div>
          )}
          <ul>
            {items.map((it) => (
              <li key={it.relPath}>
                <button
                  onClick={() => (it.isDir ? setRelPath(it.relPath) : fetchPreview(it.relPath))}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`inline-block w-2 h-2 rounded-full ${it.isDir ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                    <span className="truncate">{it.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                    {!it.isDir && <span>{formatBytes(it.size)}</span>}
                    <span>{tsToLocal(it.mtime)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="w-[40%] min-w-[320px] max-w-[560px] hidden md:flex flex-col">
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold">Preview</div>
        <div className="flex-1 overflow-auto p-3 whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900/40">
          {preview ? (
            <>
              <div className="mb-2 text-gray-600 dark:text-gray-300 text-xs">{preview.path} · {formatBytes(preview.size)}</div>
              <pre className="text-xs leading-5">{preview.content}</pre>
            </>
          ) : (
            <div className="text-gray-500 text-sm">Select a text file to preview.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilesBrowser;
