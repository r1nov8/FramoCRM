import React, { useCallback, useMemo, useState } from 'react';
import DataGrid, { Column, SortColumn, SelectColumn, RowsChangeData } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useData } from '../context/DataContext';

type Row = any;

const CSV_COLUMNS: Array<{ key: string; name: string; width?: number }> = [
  { key: 'Company', name: 'Company', width: 200 },
  { key: 'Vessels', name: 'Vessels', width: 120 },
  { key: 'Company Nationality/Region', name: 'Company Nationality/Region', width: 200 },
  { key: 'Company Primary Activity - Level 1', name: 'Company Primary Activity - Level 1', width: 260 },
  { key: 'Company City', name: 'Company City', width: 160 },
  { key: 'Company Size', name: 'Company Size', width: 140 },
  { key: 'Company Main Vessel Type', name: 'Company Main Vessel Type', width: 220 },
  { key: 'Company Website', name: 'Company Website', width: 220 },
  { key: 'Company Email Address', name: 'Company Email Address', width: 240 },
  { key: 'Group Company', name: 'Group Company', width: 180 },
  { key: 'Company Tel Number', name: 'Company Tel Number', width: 180 }
];

export default function CompanyInfoGrid() {
  const { companies, handleUpdateCompany, handleDeleteCompany, handleCreateCompanySimple } = useData() as any;
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number | string>>(new Set());
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  const rowKeyGetter = useCallback((r: Row) => r.id, []);

  const sortedRows = useMemo(() => {
    if (!sortColumns.length) return companies;
    const [{ columnKey, direction }] = sortColumns;
    const sorted = [...companies].sort((a: Row, b: Row) => {
      const av = a[columnKey];
      const bv = b[columnKey];
      return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base' });
    });
    return direction === 'DESC' ? sorted.reverse() : sorted;
  }, [companies, sortColumns]);

  const columns: readonly Column<Row>[] = useMemo(() => {
    return [
      SelectColumn,
      ...CSV_COLUMNS.map((c) => ({
        key: c.key,
        name: c.name,
        width: c.width,
        resizable: true,
        sortable: true,
        editable: true,
      }))
    ];
  }, []);

  const onRowsChange = async (updatedRows: Row[], data: RowsChangeData<Row, unknown>) => {
    const idx = (data as any).indexes?.[0];
    if (idx == null) return;
    const prev = sortedRows[idx];
    const next = updatedRows[idx];
    if (!prev || !next || prev === next) return;
    const diff: Record<string, any> = {};
    for (const c of CSV_COLUMNS) {
      if (prev[c.key] !== next[c.key]) diff[c.key] = next[c.key];
    }
    if (Object.keys(diff).length) {
      await handleUpdateCompany({ id: next.id, ...diff });
    }
  };

  const handleDelete = async () => {
    if (!selectedRows.size) return;
    if (!confirm(`Delete ${selectedRows.size} selected row(s)?`)) return;
    for (const id of selectedRows) await handleDeleteCompany(id);
    setSelectedRows(new Set());
  };

  const handleQuickAdd = async () => {
    const name = prompt('New company name');
    if (!name) return;
    await handleCreateCompanySimple({ name });
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <div className="flex items-center justify-between p-2 text-xs border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">{companies?.length || 0} rows</div>
        <div className="flex gap-2">
          <button className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={handleQuickAdd}>Add</button>
          <button className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>Delete</button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <DataGrid
          columns={columns}
          rows={sortedRows}
          rowKeyGetter={rowKeyGetter}
          onRowsChange={onRowsChange}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          className="rdg-light"
        />
      </div>
    </div>
  );
}
