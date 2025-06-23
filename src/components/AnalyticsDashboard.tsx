import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");
  
  const analytics = useQuery(api.analytics.getDashboardAnalytics, { period });
  const stockAlerts = useQuery(api.analytics.getStockAlerts, { resolved: false });
  const resolveAlert = useMutation(api.analytics.resolveStockAlert);

  const handleResolveAlert = async (alertId: any) => {
    try {
      await resolveAlert({ alertId });
      toast.success("Alert resolved");
    } catch (error) {
      toast.error("Failed to resolve alert");
    }
  };

  if (!analytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-600">
                ${analytics.totalSales.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              💰
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-blue-600">
                ${analytics.totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              📈
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.totalTransactions}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              🛒
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {analytics.topSellingProducts.slice(0, 5).map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="font-medium">{product.productName}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{product.quantitySold} sold</div>
                  <div className="text-sm text-gray-500">${product.revenue.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Category Performance</h3>
          <div className="space-y-3">
            {analytics.categoryPerformance.slice(0, 5).map((category) => (
              <div key={category.category} className="flex items-center justify-between">
                <span className="font-medium">{category.category}</span>
                <div className="text-right">
                  <div className="font-semibold">${category.sales.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Profit: ${category.profit.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Trend */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Trend (Last 7 Days)</h3>
        <div className="grid grid-cols-7 gap-2">
          {analytics.salesTrend.map((day) => (
            <div key={day.date} className="text-center">
              <div className="text-xs text-gray-500 mb-1">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="bg-blue-100 rounded p-2">
                <div className="text-sm font-semibold">${day.sales.toFixed(0)}</div>
                <div className="text-xs text-gray-600">{day.transactions} txns</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Alerts */}
      {stockAlerts && stockAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Stock Alerts</h3>
          <div className="space-y-3">
            {stockAlerts.slice(0, 5).map((alert) => (
              <div key={alert._id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{alert.productName}</h4>
                  <p className="text-sm text-gray-600">
                    {alert.alertType === "out_of_stock"
                      ? "Out of stock"
                      : `Low stock: ${alert.currentStock} remaining`
                    }
                  </p>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert._id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
