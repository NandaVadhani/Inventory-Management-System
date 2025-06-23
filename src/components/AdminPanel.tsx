import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function AdminPanel() {
  const [activeSection, setActiveSection] = useState<"products" | "inventory" | "alerts">("products");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const products = useQuery(api.products.getProducts, {});
  const categories = useQuery(api.products.getCategories);
  const stockAlerts = useQuery(api.analytics.getStockAlerts, { resolved: false });
  
  const addProduct = useMutation(api.products.addProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const resolveAlert = useMutation(api.analytics.resolveStockAlert);

  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    quantity: "",
    category: "",
    supplier: "",
    expiryDate: "",
    description: "",
    sku: "",
    costPrice: "",
    minStockLevel: "",
  });

  const resetForm = () => {
    setProductForm({
      name: "",
      price: "",
      quantity: "",
      category: "",
      supplier: "",
      expiryDate: "",
      description: "",
      sku: "",
      costPrice: "",
      minStockLevel: "",
    });
    setEditingProduct(null);
    setShowAddProduct(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const formData = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        quantity: parseInt(productForm.quantity),
        category: productForm.category,
        supplier: productForm.supplier,
        expiryDate: productForm.expiryDate || undefined,
        description: productForm.description || undefined,
        sku: productForm.sku,
        costPrice: parseFloat(productForm.costPrice),
        minStockLevel: parseInt(productForm.minStockLevel),
      };

      if (editingProduct) {
        await updateProduct({
          id: editingProduct._id,
          ...formData,
        });
        toast.success("Product updated successfully");
      } else {
        await addProduct(formData);
        toast.success("Product added successfully");
      }
      
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    }
  };

  const handleEdit = (product: any) => {
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      category: product.category,
      supplier: product.supplier,
      expiryDate: product.expiryDate || "",
      description: product.description || "",
      sku: product.sku,
      costPrice: product.costPrice.toString(),
      minStockLevel: product.minStockLevel.toString(),
    });
    setEditingProduct(product);
    setShowAddProduct(true);
  };

  const handleDelete = async (productId: Id<"products">) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct({ id: productId });
        toast.success("Product deleted successfully");
      } catch (error) {
        toast.error("Failed to delete product");
      }
    }
  };

  const handleResolveAlert = async (alertId: Id<"stockAlerts">) => {
    try {
      await resolveAlert({ alertId });
      toast.success("Alert resolved");
    } catch (error) {
      toast.error("Failed to resolve alert");
    }
  };

  if (!products || !categories) {
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
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <button
          onClick={() => setShowAddProduct(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Product
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSection("products")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeSection === "products"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Products ({products.length})
        </button>
        <button
          onClick={() => setActiveSection("inventory")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeSection === "inventory"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveSection("alerts")}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeSection === "alerts"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Alerts ({stockAlerts?.length || 0})
        </button>
      </div>

      {/* Products Section */}
      {activeSection === "products" && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Stock</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map(product => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.supplier}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{product.sku}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">${product.price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{product.quantity}</div>
                      <div className="text-xs text-gray-500">Min: {product.minStockLevel}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        product.quantity === 0
                          ? "bg-red-100 text-red-800"
                          : product.quantity <= product.minStockLevel
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}>
                        {product.quantity === 0
                          ? "Out of Stock"
                          : product.quantity <= product.minStockLevel
                          ? "Low Stock"
                          : "In Stock"
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Section */}
      {activeSection === "inventory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products
            .filter(p => p.quantity <= p.minStockLevel)
            .map(product => (
              <div key={product._id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.quantity === 0
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {product.quantity === 0 ? "Out of Stock" : "Low Stock"}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Current Stock: {product.quantity}</div>
                  <div>Minimum Level: {product.minStockLevel}</div>
                  <div>Supplier: {product.supplier}</div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Alerts Section */}
      {activeSection === "alerts" && (
        <div className="space-y-4">
          {stockAlerts?.map(alert => (
            <div key={alert._id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{alert.productName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {alert.alertType === "out_of_stock"
                      ? "Product is out of stock"
                      : `Stock is low (${alert.currentStock} remaining, minimum: ${alert.minStockLevel})`
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.alertType === "out_of_stock"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {alert.alertType === "out_of_stock" ? "Critical" : "Warning"}
                  </span>
                  <button
                    onClick={() => handleResolveAlert(alert._id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              No active alerts
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.sku}
                      onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.category}
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier *
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.supplier}
                      onChange={(e) => setProductForm(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={productForm.costPrice}
                      onChange={(e) => setProductForm(prev => ({ ...prev, costPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      value={productForm.quantity}
                      onChange={(e) => setProductForm(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Stock Level *
                    </label>
                    <input
                      type="number"
                      required
                      value={productForm.minStockLevel}
                      onChange={(e) => setProductForm(prev => ({ ...prev, minStockLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={productForm.expiryDate}
                      onChange={(e) => setProductForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingProduct ? "Update Product" : "Add Product"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
