import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../common/Loader';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const response = await api.get(`/api/orders${params}`);
      if (response.data.success) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentBadge = (paymentStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800'
    };
    return badges[paymentStatus] || 'bg-gray-100 text-gray-800';
  };

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center py-8">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
        <div className="text-sm text-gray-600">
          Total: {orders.length} order(s)
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4 overflow-x-auto">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending', label: 'Pending' },
            { key: 'processing', label: 'Processing' },
            { key: 'shipped', label: 'Shipped' },
            { key: 'delivered', label: 'Delivered' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {statusCounts[tab.key] > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  statusFilter === tab.key ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {statusCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No orders found
          </h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all' 
              ? "You haven't placed any orders yet."
              : `You don't have any ${statusFilter} orders.`}
          </p>
          <Link
            to="/shop"
            className="inline-block btn-primary"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.order_number}
                    </h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentBadge(order.payment_status)}`}>
                      Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Placed on: {new Date(order.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</div>
                    <div>Items: {order.item_count} item(s)</div>
                    {order.shipping_address && (
                      <div className="text-xs text-gray-500">
                        Shipping to: {order.shipping_address.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    ৳{order.total_amount.toFixed(2)}
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="text-sm text-green-600">
                      Discount: -৳{order.discount_amount.toFixed(2)}
                    </div>
                  )}
                  {order.loyalty_points_used > 0 && (
                    <div className="text-xs text-gray-500">
                      Used {order.loyalty_points_used} points
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {order.items?.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-lg">🛠️</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.product_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        Qty: {item.quantity} × ৳{parseFloat(item.product_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 space-y-1 mb-3 sm:mb-0">
                  <div>
                    <strong>Payment Method:</strong> {order.payment_method === 'cash' ? 'Cash on Delivery' : 'Online Payment'}
                  </div>
                  {order.shipping_phone && (
                    <div>
                      <strong>Phone:</strong> {order.shipping_phone}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {order.items && order.items.length > 6 && (
                    <span className="text-primary-500">+{order.items.length - 6} more item(s)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;

