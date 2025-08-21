import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid, SelectColumn } from 'react-data-grid';
import type { Column, SortColumn, RowsChangeData } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import './companyInfoGrid.css';
import { useData } from '../context/DataContext';

type Row = any;

type CompanyInfoGridProps = {
  selectedRows?: ReadonlySet<number | string>;
  onSelectedRowsChange?: (selection: ReadonlySet<number | string>) => void;
  addTrigger?: number;
  onCountsChange?: (visible: number, total: number) => void;
  clearFiltersTrigger?: number;
};

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

export default function CompanyInfoGrid(props: CompanyInfoGridProps) {
  const { companies, handleUpdateCompany, handleDeleteCompany, handleCreateCompanySimple } = useData() as any;
  // Allow parent to control selection; fall back to internal state
  const [internalSelectedRows, setInternalSelectedRows] = useState<ReadonlySet<number | string>>(new Set());
  const selectedRows = props.selectedRows ?? internalSelectedRows;
  const setSelectedRows = props.onSelectedRowsChange ?? setInternalSelectedRows;
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  // Local rows state for optimistic edits
  const [rows, setRows] = useState<Row[]>([]);
  const [draftIdCounter, setDraftIdCounter] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const rowKeyGetter = useCallback((r: Row) => r.id, []);

  const sortedRows = useMemo(() => {
    // Guard: filter out empty company names client-side too
    const nonEmpty = (companies || []).filter((c: Row) => String(c?.Company ?? '').trim() !== '');
    if (!sortColumns.length) return nonEmpty;
    const [{ columnKey, direction }] = sortColumns;
    const sorted = [...nonEmpty].sort((a: Row, b: Row) => {
      const av = a[columnKey];
      const bv = b[columnKey];
      // Try numeric-first comparison for columns that contain numbers; else string compare
      const an = Number.parseFloat(String(av ?? '').replace(/[^0-9.\-]/g, ''));
      const bn = Number.parseFloat(String(bv ?? '').replace(/[^0-9.\-]/g, ''));
      if (Number.isFinite(an) && Number.isFinite(bn)) {
        return an - bn;
      }
      return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base' });
    });
    return direction === 'DESC' ? sorted.reverse() : sorted;
  }, [companies, sortColumns]);

  // Keep local rows in sync with companies/sort changes
  useEffect(() => {
    setRows(sortedRows);
  }, [sortedRows]);

  // When addTrigger increments, insert a new draft row at the top and start editing the Company cell
  useEffect(() => {
    if (!props.addTrigger) return;
    const draftId = `draft-${Date.now()}-${draftIdCounter}`;
    setDraftIdCounter(n => n + 1);
    const draft: Row = {
      id: draftId,
      Company: '',
      Vessels: '',
      'Company Nationality/Region': '',
      'Company Primary Activity - Level 1': '',
      'Company City': '',
      'Company Size': '',
      'Company Main Vessel Type': '',
      'Company Website': '',
      'Company Email Address': '',
      'Group Company': '',
      'Company Tel Number': ''
    };
    setRows(prev => [draft, ...prev]);
    // Select the new draft row so user sees focus; RDG will start edit on click
    setSelectedRows(new Set([draftId]));
  }, [props.addTrigger]);

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
        editorOptions: { editOnClick: true },
        renderHeaderCell: () => (
          <div className="rdg-header-with-filter">
            <div className="rdg-header-title" title={c.name}>{c.name}</div>
            <div className="rdg-filter-row">
              <input
                className="rdg-filter-input"
                value={filters[c.key] ?? ''}
                onChange={(e) => setFilters(prev => ({ ...prev, [c.key]: e.target.value }))}
                placeholder="Filter..."
              />
              {Boolean(filters[c.key]) && (
                <button
                  type="button"
                  aria-label="Clear filter"
                  className="rdg-filter-clear"
                  onClick={() => setFilters(prev => ({ ...prev, [c.key]: '' }))}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )
      }))
    ];
  }, [filters]);

  // Apply filters to current rows
  const visibleRows = useMemo(() => {
    const activeKeys = Object.keys(filters).filter(k => (filters[k] ?? '').trim() !== '');
    if (!activeKeys.length) return rows;
    const lower = (v: any) => String(v ?? '').toLowerCase();
    return rows.filter(r =>
      activeKeys.every(k => lower(r[k]).includes(filters[k].trim().toLowerCase()))
    );
  }, [rows, filters]);

  // Notify parent with counts (visible vs total)
  useEffect(() => {
    props.onCountsChange?.(visibleRows.length, rows.length);
  }, [visibleRows.length, rows.length]);

  // Clear filters when trigger changes
  useEffect(() => {
    if (props.clearFiltersTrigger) setFilters({});
  }, [props.clearFiltersTrigger]);

  const onRowsChange = async (updatedRows: Row[], data: RowsChangeData<Row, unknown>) => {
    // Optimistically update UI, keep snapshot for rollback on failure
  const prevRowsSnapshot = rows;
  // updatedRows corresponds to the currently visibleRows list; map change back to full rows by id
  const idx = (data as any).indexes?.[0];
    if (idx == null) return;
  const next = updatedRows[idx];
  // Find matching row in full dataset
  const fullIndex = prevRowsSnapshot.findIndex(r => r.id === next.id);
  if (fullIndex === -1) return;
  const prev = prevRowsSnapshot[fullIndex];
  // Build new full rows array with the updated row merged
  const mergedFullRows = prevRowsSnapshot.map((r, i) => (i === fullIndex ? { ...prev, ...next } : r));
  setRows(mergedFullRows);
    if (!prev || !next || prev === next) return;
    const isDraft = String(next.id).startsWith('draft-');
    // Compute diffs
    const diff: Record<string, any> = {};
    for (const c of CSV_COLUMNS) {
      if (prev?.[c.key] !== next[c.key]) diff[c.key] = next[c.key];
    }
    if (!Object.keys(diff).length) return;
    try {
      if (isDraft) {
        // Require at least Company name to create
        const name = next['Company']?.trim?.() || '';
        if (!name) return; // keep draft until user enters a name
        const created = await handleCreateCompanySimple({ name });
        // Merge created id into row and persist remaining fields
        const createdId = created.id;
        const remaining: Record<string, any> = { ...diff };
        delete remaining['Company'];
        if (Object.keys(remaining).length) {
          await handleUpdateCompany({ id: createdId, ...remaining });
        }
        // Replace draft row with created one in local state
        setRows(cur => cur.map(r => (r.id === next.id ? { ...created, ...next, id: createdId } : r)));
        setSelectedRows(new Set([createdId]));
      } else {
        await handleUpdateCompany({ id: next.id, ...diff });
      }
    } catch (e) {
      // Revert UI if save fails
      setRows(prevRowsSnapshot);
      alert('Failed to save change. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <div className="flex-1 min-h-0">
        <DataGrid
          columns={columns}
          rows={visibleRows}
          rowKeyGetter={rowKeyGetter}
          onRowsChange={onRowsChange}
          defaultColumnOptions={{
            resizable: true,
            sortable: true,
            editable: true,
            editorOptions: { editOnClick: true }
          }}
          headerRowHeight={56}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          className="rdg-light"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
