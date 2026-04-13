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

type CartItem = MenuItem & { quantity: number }

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ordered, setOrdered] = useState(false)

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

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function removeFromCart(id: number) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id)
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i
        )
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  async function placeOrder() {
    const { error } = await supabase.from('orders').insert([
      {
        items: cart,
        total: total,
        status: 'pending',
        table_number: 1,
      },
    ])

    if (!error) {
      setOrdered(true)
      setCart([])
    }
  }

  if (loading) return <p className="p-4 text-center">Loading menu...</p>

 if (ordered) return (
    <main className="p-4 max-w-2xl mx-auto text-center mt-20">
      <p className="text-5xl mb-4">🎉</p>
      <h2 className="text-2xl font-bold">Order Placed!</h2>
      <p className="text-gray-500 mt-2">Your order is being prepared. Sit back and relax!</p>
      <button
        onClick={() => setOrdered(false)}
        className="mt-6 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
      >
        ➕ Add More Items
      </button>
    </main>
  
  )

  return (
    <main className="p-4 max-w-2xl mx-auto pb-60">
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
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {item.category}
              </span>
              <button
                onClick={() => addToCart(item)}
                className="bg-black text-white px-4 py-1 rounded-full text-sm hover:bg-gray-800 transition"
              >
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl p-4 max-w-2xl mx-auto">
          <h3 className="font-bold text-lg mb-2">🛒 Your Order</h3>
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center mb-2">
              <span>{item.name} x{item.quantity}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{item.price * item.quantity} MAD</span>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{total} MAD</span>
          </div>
          <button
            onClick={placeOrder}
            className="w-full bg-black text-white py-3 rounded-xl mt-3 font-semibold hover:bg-gray-800 transition"
          >
            Place Order 🍽️
          </button>
        </div>
      )}
    </main>
  )
}