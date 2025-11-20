'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '' });

  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingCategory) {
      // Atualizar
      const { error } = await supabase
        .from('categories')
        .update({ name: formData.name })
        .eq('id', editingCategory.id);
    } else {
      // Criar
      const { error } = await supabase.from('categories').insert({ name: formData.name });
    }

    resetForm();
    loadCategories();
  }

  function resetForm() {
    setFormData({ name: '' });
    setEditingCategory(null);
    setShowForm(false);
  }

  function handleEdit(category: Category) {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta categoria? Produtos associados também serão excluídos.')) return;

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      loadCategories();
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">Categorias</h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ name: e.target.value })}
              placeholder="Nome da categoria"
              required
              className="flex-1 px-3 py-2 border rounded-lg placeholder:text-gray-500 text-gray-700"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingCategory ? 'Salvar' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <div
            key={category.id}
            className="bg-green-100 text-gray-700 rounded-lg shadow-sm px-4 py-2 flex items-center gap-2"
          >
            <span className="text-sm font-medium">{category.name}</span>
            <button
              onClick={() => handleEdit(category)}
              className="p-1 text-blue-600 hover:text-blue-700"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="p-1 text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

