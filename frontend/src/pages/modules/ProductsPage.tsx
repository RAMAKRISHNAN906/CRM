import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, Layers3, Package, Plus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, Column } from '../../components/modules/DataTable';
import { Input } from '../../components/ui/Input';
import { settingsProductsService } from '../../services/settingsProducts.service';
import { ProductCategory, ProductDefinition, ProductFlat, SettingsProductsPayload } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type CatalogRow = ProductFlat & {
  categoryIndex: number;
  groupIndex: number;
  productIndex: number;
};

type ProductEditorState = {
  category: string;
  group: string;
  product: string;
  value: string;
};

const emptyForm = (): ProductEditorState => ({
  category: '',
  group: '',
  product: '',
  value: '',
});

const normalize = (value: string) => value.trim();
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const cloneCatalog = (catalog: ProductCategory[]): ProductCategory[] =>
  catalog.map((category) => ({
    name: category.name,
    groups: category.groups.map((group) => ({
      name: group.name,
      products: group.products.map((product) => ({
        id: product.id,
        name: product.name,
        value: Number(product.value || 0),
      })),
    })),
  }));

const flattenCatalog = (catalog: ProductCategory[]): CatalogRow[] => {
  const rows: CatalogRow[] = [];

  catalog.forEach((category, categoryIndex) => {
    category.groups.forEach((group, groupIndex) => {
      group.products.forEach((product, productIndex) => {
        rows.push({
          id: Number(product.id),
          category: category.name,
          group: group.name,
          name: product.name,
          value: Number(product.value || 0),
          createdAt: undefined,
          updatedAt: undefined,
          categoryIndex,
          groupIndex,
          productIndex,
        });
      });
    });
  });

  return rows;
};

const removeEmptyBranches = (catalog: ProductCategory[]): ProductCategory[] =>
  catalog
    .map((category) => ({
      ...category,
      groups: category.groups
        .map((group) => ({
          ...group,
          products: group.products.filter((product) => normalize(product.name).length > 0),
        }))
        .filter((group) => group.products.length > 0),
    }))
    .filter((category) => category.groups.length > 0);

const upsertProduct = (
  catalog: ProductCategory[],
  form: ProductEditorState,
  editing: CatalogRow | null,
): ProductCategory[] => {
  const categoryName = normalize(form.category);
  const groupName = normalize(form.group);
  const productName = normalize(form.product);
  const value = Number(form.value || 0);

  if (!categoryName || !groupName || !productName) {
    return catalog;
  }

  const next = cloneCatalog(catalog);

  if (editing) {
    const currentCategory = next[editing.categoryIndex];
    const currentGroup = currentCategory?.groups[editing.groupIndex];
    if (currentGroup) {
      currentGroup.products = currentGroup.products.filter((_, index) => index !== editing.productIndex);
      if (currentGroup.products.length === 0) {
        currentCategory.groups = currentCategory.groups.filter((_, index) => index !== editing.groupIndex);
      }
      if (currentCategory.groups.length === 0) {
        next.splice(editing.categoryIndex, 1);
      }
    }
  }

  let category = next.find((item) => same(item.name, categoryName));
  if (!category) {
    category = { name: categoryName, groups: [] };
    next.push(category);
  }

  let group = category.groups.find((item) => same(item.name, groupName));
  if (!group) {
    group = { name: groupName, products: [] };
    category.groups.push(group);
  }

  const existingIndex = group.products.findIndex((item) => same(item.name, productName));
  const product: ProductDefinition = {
    id: editing?.id ?? Date.now(),
    name: productName,
    value: Number.isFinite(value) ? value : 0,
  };

  if (existingIndex >= 0) {
    group.products[existingIndex] = product;
  } else {
    group.products.push(product);
  }

  return removeEmptyBranches(next);
};

const deleteProduct = (catalog: ProductCategory[], row: CatalogRow): ProductCategory[] => {
  const next = cloneCatalog(catalog);
  const category = next[row.categoryIndex];
  const group = category?.groups[row.groupIndex];
  if (!group) return catalog;

  group.products = group.products.filter((_, index) => index !== row.productIndex);
  if (group.products.length === 0) {
    category.groups = category.groups.filter((_, index) => index !== row.groupIndex);
  }
  if (category.groups.length === 0) {
    next.splice(row.categoryIndex, 1);
  }

  return removeEmptyBranches(next);
};

const formatAmount = (value: number) =>
  formatCurrency(value, undefined, { notation: 'standard', maximumFractionDigits: 0 });

const ProductEditorModal: React.FC<{
  open: boolean;
  saving: boolean;
  editing: CatalogRow | null;
  form: ProductEditorState;
  onChange: (next: ProductEditorState) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({ open, saving, editing, form, onChange, onSubmit, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-3xl border border-border bg-surface-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">{editing ? 'Edit Product' : 'Add Product'}</h3>
            <p className="text-xs text-gray-400">
              Saved here, then reused in Leads, Quotes, Product Details, and Targets.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
            placeholder="Software"
          />
          <Input
            label="Group"
            value={form.group}
            onChange={(e) => onChange({ ...form, group: e.target.value })}
            placeholder="Healthcare"
          />
          <Input
            label="Product"
            className="md:col-span-2"
            value={form.product}
            onChange={(e) => onChange({ ...form, product: e.target.value })}
            placeholder="Hospital Management"
          />
          <Input
            label="Value"
            type="number"
            min="0"
            value={form.value}
            onChange={(e) => onChange({ ...form, value: e.target.value })}
            placeholder="300000"
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={saving}
            icon={<Save size={14} />}
            disabled={saving || !form.category.trim() || !form.group.trim() || !form.product.trim()}
          >
            {saving ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CatalogRow | null>(null);
  const [draft, setDraft] = useState<ProductEditorState>(emptyForm());
  const [deleteRow, setDeleteRow] = useState<CatalogRow | null>(null);

  const { data, isLoading } = useQuery<SettingsProductsPayload>({
    queryKey: ['settings-products'],
    queryFn: settingsProductsService.get,
  });

  useEffect(() => {
    if (data?.categories) {
      setCatalog(cloneCatalog(data.categories));
    }
  }, [data]);

  const rows = useMemo(() => flattenCatalog(catalog), [catalog]);
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row.category, row.group, row.name, String(row.value)].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const categoryCount = catalog.length;
    const groupCount = catalog.reduce((sum, category) => sum + category.groups.length, 0);
    const productCount = rows.length;
    const totalValue = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

    return { categoryCount, groupCount, productCount, totalValue };
  }, [catalog, rows]);

  const saveMutation = useMutation({
    mutationFn: async ({ nextCatalog, message }: { nextCatalog: ProductCategory[]; message: string }) => {
      const payload = await settingsProductsService.update(nextCatalog);
      return { payload, message };
    },
    onSuccess: ({ payload, message }) => {
      const nextCatalog = cloneCatalog(payload.categories || []);
      setCatalog(nextCatalog);
      queryClient.setQueryData(['settings-products'], payload);
      queryClient.invalidateQueries({ queryKey: ['settings-products'] });
      toast.success(message);
      setEditorOpen(false);
      setEditingRow(null);
      setDraft(emptyForm());
      setDeleteRow(null);
    },
    onError: (err: any) => {
      const apiError = err?.response?.data?.error;
      const message =
        (typeof apiError === 'string' ? apiError : apiError?.message) ||
        err?.response?.data?.message ||
        'Failed to save product';
      toast.error(message);
    },
  });

  const openAddProduct = () => {
    setEditingRow(null);
    setDraft(emptyForm());
    setEditorOpen(true);
  };

  const openEditProduct = (row: CatalogRow) => {
    setEditingRow(row);
    setDraft({
      category: row.category,
      group: row.group,
      product: row.name,
      value: String(row.value || 0),
    });
    setEditorOpen(true);
  };

  const handleSubmit = () => {
    const categoryName = normalize(draft.category);
    const groupName = normalize(draft.group);
    const productName = normalize(draft.product);

    if (!categoryName || !groupName || !productName) {
      toast.error('Please fill category, group, and product');
      return;
    }

    const nextCatalog = upsertProduct(catalog, draft, editingRow);
    saveMutation.mutate({
      nextCatalog,
      message: editingRow ? 'Product updated' : 'Product added',
    });
  };

  const handleDelete = (row: CatalogRow) => {
    setDeleteRow(row);
  };

  const confirmDelete = () => {
    if (!deleteRow) return;
    const nextCatalog = deleteProduct(catalog, deleteRow);
    saveMutation.mutate({
      nextCatalog,
      message: 'Product removed',
    });
  };

  const columns: Column<CatalogRow>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (value, row) => (
        <div className="space-y-1">
          <p className="font-medium text-white">{value}</p>
          <p className="text-xs text-gray-500">Product ID #{row.id}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (value) => <Badge label={String(value)} variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30" />,
    },
    {
      key: 'group',
      header: 'Group',
      render: (value) => <Badge label={String(value)} variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30" />,
    },
    {
      key: 'value',
      header: 'Value',
      render: (value) => <span className="font-medium text-green-400">{formatAmount(Number(value || 0))}</span>,
      className: 'text-right',
      width: 'w-40',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
              <Package size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Products</h1>
              <p className="text-sm text-gray-400 mt-0.5">Shared product catalog management</p>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-gray-400">
            Add, edit, and remove products here. The same catalog powers Lead product selection, Product Details,
            quote generation, and target mapping.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Categories', value: stats.categoryCount, icon: <Layers3 size={18} /> },
          { label: 'Total Groups', value: stats.groupCount, icon: <Package size={18} /> },
          { label: 'Total Products', value: stats.productCount, icon: <Package size={18} /> },
          { label: 'Catalog Value', value: formatAmount(stats.totalValue), icon: <BadgeDollarSign size={18} /> },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-surface-secondary/80 p-5 shadow-lg shadow-black/10">
            <div className="mb-3 flex items-center justify-between text-gray-400">
              <span className="text-sm">{item.label}</span>
              <span className="rounded-full border border-border bg-surface-tertiary px-2 py-1 text-xs text-gray-500">Live</span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-bold text-white">{item.value}</p>
              <div className="rounded-xl border border-border bg-surface-tertiary p-2 text-emerald-400">
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface-secondary/50 p-4 text-sm text-gray-300">
        <p>
          Any product added here will automatically appear in the Lead wizard, Lead Product Details, and other
          areas that read from the shared <span className="text-white">settings/products</span> catalog.
        </p>
      </div>

      <DataTable
        data={filteredRows}
        columns={columns}
        isLoading={isLoading}
        total={filteredRows.length}
        page={1}
        limit={Math.max(filteredRows.length, 1)}
        onSearch={setSearch}
        searchPlaceholder="Search products, groups, or categories..."
        onEdit={openEditProduct}
        onDelete={handleDelete}
        rowKey={(row) => String(row.id)}
        emptyTitle="No products yet"
        emptySubtitle="Add your first product to make it available across the CRM"
        emptyIcon={<Package size={24} />}
        actions={(
          <Button type="button" icon={<Plus size={15} />} onClick={openAddProduct} size="sm">
            New Product
          </Button>
        )}
      />

      <ProductEditorModal
        open={editorOpen}
        saving={saveMutation.isPending}
        editing={editingRow}
        form={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        onClose={() => {
          if (saveMutation.isPending) return;
          setEditorOpen(false);
          setEditingRow(null);
          setDraft(emptyForm());
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteRow}
        onClose={() => {
          if (saveMutation.isPending) return;
          setDeleteRow(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete ${deleteRow?.name}? This will remove it from Leads, Product Details, and Quotes.`}
        confirmLabel="Delete Product"
        isLoading={saveMutation.isPending}
      />
    </div>
  );
};
