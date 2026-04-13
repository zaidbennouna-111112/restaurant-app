'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type MenuItem = {
  id: number
  name: string
  description: string
  price: number
  category: string
  image_url: string
  available: boolean
}

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)

      if (!error) setMenuItems(data)
      setLoading(false)
    }

    fetchMenu()
  }, [])

  if (loading) return <p className="p-4 text-center">Loading menu...</p>

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-center">🍽️ Our Menu</h1>
      <p className="text-center text-gray-400 mb-6">Scan • Order • Enjoy</p>
      <div className="grid gap-4">
        {menuItems.map((item) => (
          <div key={item.id} className="border rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <span className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                {item.price} MAD
              </span>
            </div>
            <p className="text-gray-500 mt-1 text-sm">{item.description}</p>
            <span className="text-xs text-gray-400 mt-2 inline-block bg-gray-100 px-2 py-1 rounded-full">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}