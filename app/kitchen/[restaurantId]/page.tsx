'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

type Order = {
  id: number
  table_number: number
  items: { name: string; quantity: number; price: number }[]
  total: number
  status: string
  created_at: string
}

export default function KitchenPage() {
  const { restaurantId } = useParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [lastUpdated, setLastUpdated] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [checking, setChecking] = useState(false)

  async function checkPin() {
    if (pinInput.length !== 4) {
      setPinError('PIN must be 4 digits')
      return
    }

    setChecking(true)
    const { data } = await supabase
      .from('profiles')
      .select('kitchen_pin')
      .eq('id', restaurantId)
      .single()

    if (data && data.kitchen_pin === pinInput) {
      setAuthenticated(true)
      setPinError('')
      sessionStorage.setItem(`kitchen_auth_${restaurantId}`, 'true')
    } else {
      setPinError('Incorrect PIN, please try again')
    }
    setChecking(false)
  }

  useEffect(() => {
    const alreadyAuth = sessionStorage.getItem(`kitchen_auth_${restaurantId}`)
    if (alreadyAuth === 'true') setAuthenticated(true)
  }, [])

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('status', 'delivered')
      .order('created_at', { ascending: true })

    if (data) {
      setOrders(data)
      setLastUpdated(new Date().toLocaleTimeString())
    }
  }

  useEffect(() => {
    if (!authenticated) return

    fetchOrders()

    const channel = supabase
      .channel('orders-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchOrders()
      })
      .subscribe()

    const interval = setInterval(() => {
      fetchOrders()
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [authenticated])

  async function updateStatus(id: number, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id)
    fetchOrders()
  }

  function getStatusColor(status: string) {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (status === 'preparing') return 'bg-blue-100 text-blue-700'
    return 'bg-green-100 text-green-700'
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
          <p className="text-4xl mb-4">👨‍🍳</p>
          <h1 className="text-2xl font-bold mb-2">Kitchen Access</h1>
          <p className="text-gray-400 mb-6 text-sm">Enter your 4-digit PIN to continue</p>

          {pinError && (
            <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm">
              {pinError}
            </div>
          )}

          <input
            type="number"
            placeholder="Enter PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            maxLength={4}
            className="w-full border rounded-xl p-3 mb-4 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-black"
          />

          <button
            onClick={checkPin}
            disabled={checking}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Enter Kitchen'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-center">👨‍🍳 Kitchen Dashboard</h1>
      <p className="text-center text-gray-400 mb-1">Live incoming orders</p>
      <p className="text-center text-xs text-gray-300 mb-6">Last updated: {lastUpdated}</p>

      {orders.length === 0 && (
        <p className="text-center text-gray-400 mt-20 text-xl">No active orders right now 🎉</p>
      )}

      <div className="grid gap-4">
        {orders.map((order) => (
          <div key={order.id} className="border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold">Table {order.table_number}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            <div className="mb-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{item.price * item.quantity} MAD</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-bold">Total: {order.total} MAD</span>
              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm hover:bg-blue-600 transition"
                  >
                    Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="bg-green-500 text-white px-4 py-1 rounded-full text-sm hover:bg-green-600 transition"
                  >
                    Delivered ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}