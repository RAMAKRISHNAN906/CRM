import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Search, Filter, RefreshCw, Trash2, Edit2, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SkeletonTable } from '../ui/Skeleton';

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  actions?: React.ReactNode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
  rowKey?: (row: T) => string;
}

export function DataTable<T>({
  data, columns, isLoading, total = 0, page = 1, limit = 20,
  onPageChange, onSearch, searchPlaceholder = 'Search...', onSort,
  onEdit, onDelete, onView, actions, emptyTitle = 'No records found',
  emptySubtitle = 'Get started by creating a new record', emptyIcon, rowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchValue, setSearchValue] = useState('');

  const totalPages = Math.ceil(total / limit);

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {onSearch && (
          <div className="flex-1 min-w-[160px] sm:max-w-xs">
            <Input
              icon={<Search size={15} />}
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              fullWidth
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {actions}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-surface-secondary">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-tertiary/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider',
                      col.sortable && 'cursor-pointer hover:text-gray-200 select-none',
                      col.width,
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        sortOrder === 'asc' ? <ChevronUp size={12} className="text-accent-muted" /> : <ChevronDown size={12} className="text-accent-muted" />
                      )}
                    </div>
                  </th>
                ))}
                {(onEdit || onDelete || onView) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}>
                    <SkeletonTable rows={5} />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center gap-3"
                    >
                      {emptyIcon && (
                        <div className="w-14 h-14 rounded-2xl bg-surface-tertiary flex items-center justify-center text-gray-600">
                          {emptyIcon}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{emptyTitle}</p>
                        <p className="text-gray-500 text-sm mt-1">{emptySubtitle}</p>
                      </div>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                data.map((row: any, idx) => (
                  <motion.tr
                    key={rowKey ? rowKey(row) : row.id || idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-border/50 hover:bg-white/3 transition-colors group"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3 text-sm text-gray-300', col.className)}>
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                    {(onEdit || onDelete || onView) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onView && (
                            <button onClick={() => onView(row)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors">
                              <Eye size={14} />
                            </button>
                          )}
                          {onEdit && (
                            <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg hover:bg-accent-20 text-gray-500 hover:text-accent-muted transition-colors">
                              <Edit2 size={14} />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(row)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-tertiary/30">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} results
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="xs"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange?.(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      p === page ? 'bg-accent-20 text-accent-muted border border-accent-30' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              <Button
                variant="ghost" size="xs"
                disabled={page >= totalPages}
                onClick={() => onPageChange?.(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
