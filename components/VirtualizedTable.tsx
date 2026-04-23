'use client';

import { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ClientRecord } from '@/types/client';
import Badge from '@/components/ui/Badge';
import {
  Pencil,
  ArrowSquareOut,
  Eye,
  Calendar,
  Buildings,
  FileText,
  User,
  MapPin,
  Shield,
  Globe,
  Key,
  Check,
  WarningCircle,
  Lightning,
  CheckCircle,
  ChatCircle,
  Pen,
  Flag,
  Clock,
  House,
  Funnel,
} from '@phosphor-icons/react';
import { formatDateFR, getStatutBadgeColor, getFinancementBadgeColor } from '@/lib/clientTableUtils';

interface VirtualizedTableProps {
  items: ClientRecord[];
  onEdit: (client: ClientRecord) => void;
  onView: (client: ClientRecord) => void;
  height?: number;
  itemSize?: number;
}

interface TableRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: ClientRecord[];
    onEdit: (client: ClientRecord) => void;
    onView: (client: ClientRecord) => void;
  };
}

function TableRow({ index, style, data }: TableRowProps) {
  const { items, onEdit, onView } = data;
  const client = items[index];

  if (!client) return null;

  return (
    <div
      style={style}
      className="flex items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
    >
      {/* Client */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-slate-400 flex-shrink-0" weight="bold" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {client.client}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {client.ville}
            </p>
          </div>
        </div>
      </div>

      {/* Statut */}
      <div className="flex-1 min-w-0 px-4">
        <Badge variant={getStatutBadgeColor(client.statut)}>
          {client.statut}
        </Badge>
      </div>

      {/* Date */}
      <div className="flex-1 min-w-0 px-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" weight="bold" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {client.dateEnvoi ? formatDateFR(client.dateEnvoi) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4">
        <button
          onClick={() => onView(client)}
          className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-150"
          title="Voir détails"
        >
          <Eye className="h-4 w-4" weight="bold" />
        </button>
        <button
          onClick={() => onEdit(client)}
          className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-150"
          title="Modifier"
        >
          <Pencil className="h-4 w-4" weight="bold" />
        </button>
      </div>
    </div>
  );
}

export default function VirtualizedTable({
  items,
  onEdit,
  onView,
  height = 600,
  itemSize = 80
}: VirtualizedTableProps) {
  const itemData = useMemo(() => ({
    items,
    onEdit,
    onView,
  }), [items, onEdit, onView]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-slate-400 mb-4" weight="bold" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
          Aucun résultat
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Aucun client ne correspond aux critères de recherche.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Client</span>
        </div>
        <div className="flex-1 px-4">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Statut</span>
        </div>
        <div className="flex-1 px-4">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Date</span>
        </div>
        <div className="px-4">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Actions</span>
        </div>
      </div>

      {/* Virtualized List */}
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemSize}
        itemData={itemData}
        className="scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
      >
        {TableRow}
      </List>

      {/* Footer with count */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {items.length} résultat{items.length > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}