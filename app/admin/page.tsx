'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

type MenuItem = {
  id: number
  name: string
  description: string
  price: number
  category: string
  image_URL: string
  available: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_URL: '',
    available: true,
  })

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
    fetchItems()

    const channel = supabase
      .channel('menu-items-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'menu_items'
      }, () => {
        fetchItems()
      })
      .subscribe()

    const interval = setInterval(() => {
      fetchItems()
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

async function fetchItems() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', session.user.id)
      .order('id', { ascending: true })
    if (data) setMenuItems(data)
    setLoading(false)
  }

  function openAddForm() {
    setEditItem(null)
    setForm({ name: '', description: '', price: '', category: '', image_URL: '', available: true })
    setShowForm(true)
  }

  function openEditForm(item: MenuItem) {
    setEditItem(item)
    setForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image_URL: item.image_URL,
      available: item.available,
    })
    setShowForm(true)
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileName = `${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file)

    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName)
      setForm((prev) => ({ ...prev, image_URL: urlData.publicUrl }))
    }
    setUploading(false)
  }

  async function saveItem() {
    if (!form.name || !form.price) {
      alert('Name and price are required!')
      return
    }

const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category: form.category || null,
      image_URL: form.image_URL || null,
      available: form.available,
      restaurant_id: session.user.id,
    }

    if (editItem) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editItem.id)
      if (error) { alert('Error updating: ' + error.message); return }
    } else {
      const { error } = await supabase.from('menu_items').insert([payload])
      if (error) { alert('Error adding: ' + error.message); return }
    }

    setShowForm(false)
    fetchItems()
  }

  async function deleteItem(id: number) {
    if (!confirm('Are you sure you want to delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    fetchItems()
  }

  async function toggleAvailable(item: MenuItem) {
    await supabase
      .from('menu_items')
      .update({ available: !item.available })
      .eq('id', item.id)
    fetchItems()
  }

  if (loading) return <p className="p-4 text-center">Loading...</p>

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">⚙️ Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700 font-semibold"
        >
          Logout
        </button>
      </div>
      <p className="text-gray-400 mb-6">Manage your menu</p>

      <button
        onClick={openAddForm}
        className="w-full bg-black text-white py-3 rounded-xl font-semibold mb-6 hover:bg-gray-800 transition"
      >
        + Add New Dish
      </button>

      {showForm && (
        <div className="border rounded-xl p-4 mb-6 shadow-sm bg-gray-50">
          <h2 className="font-bold text-lg mb-4">{editItem ? 'Edit Dish' : 'New Dish'}</h2>

          <input
            placeholder="Dish name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg p-2 mb-3"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg p-2 mb-3"
          />
          <input
            placeholder="Price (MAD) *"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-full border rounded-lg p-2 mb-3"
          />
          <input
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded-lg p-2 mb-3"
          />

          <div className="mb-3">
            <label className="text-sm text-gray-500 mb-1 block">Dish Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={uploadImage}
              className="w-full border rounded-lg p-2"
            />
            {uploading && <p className="text-sm text-blue-500 mt-1">Uploading image...</p>}
            {form.image_URL && (
              <img src={form.image_URL} alt="preview" className="mt-2 h-24 rounded-lg object-cover" />
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              id="available"
            />
            <label htmlFor="available" className="text-sm">Available</label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveItem}
              className="flex-1 bg-black text-white py-2 rounded-xl font-semibold hover:bg-gray-800 transition"
            >
              {editItem ? 'Save Changes' : 'Add Dish'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border py-2 rounded-xl font-semibold hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {menuItems.map((item) => (
          <div key={item.id} className="border rounded-xl p-4 shadow-sm flex gap-4">
            {item.image_URL && (
              <img src={item.image_URL} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">{item.name}</h2>
                <span className="text-green-600 font-bold">{item.price} MAD</span>
              </div>
              <p className="text-gray-500 text-sm">{item.description}</p>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{item.category}</span>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toggleAvailable(item)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {item.available ? '✓ Available' : '✕ Unavailable'}
                </button>
                <button
                  onClick={() => openEditForm(item)}
                  className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}