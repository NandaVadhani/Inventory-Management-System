import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  products: defineTable({
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    category: v.string(),
    supplier: v.string(),
    expiryDate: v.optional(v.string()),
    description: v.optional(v.string()),
    sku: v.string(),
    costPrice: v.number(),
    minStockLevel: v.number(),
    isActive: v.boolean(),
  })
    .index("by_category", ["category"])
    .index("by_sku", ["sku"])
    .index("by_active", ["isActive"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["category", "isActive"],
    }),

  sales: defineTable({
    productId: v.id("products"),
    productName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalAmount: v.number(),
    profit: v.number(),
    customerId: v.optional(v.string()),
    timestamp: v.number(),
    category: v.string(),
  })
    .index("by_product", ["productId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_category", ["category"]),

  transactions: defineTable({
    items: v.array(v.object({
      productId: v.id("products"),
      productName: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      totalAmount: v.number(),
    })),
    totalAmount: v.number(),
    totalProfit: v.number(),
    customerId: v.optional(v.string()),
    timestamp: v.number(),
    paymentMethod: v.string(),
  })
    .index("by_timestamp", ["timestamp"]),

  stockAlerts: defineTable({
    productId: v.id("products"),
    productName: v.string(),
    currentStock: v.number(),
    minStockLevel: v.number(),
    alertType: v.string(), // "low_stock", "out_of_stock", "expired"
    isResolved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_resolved", ["isResolved"]),

  analytics: defineTable({
    date: v.string(), // YYYY-MM-DD format
    totalSales: v.number(),
    totalProfit: v.number(),
    totalTransactions: v.number(),
    topSellingProducts: v.array(v.object({
      productId: v.id("products"),
      productName: v.string(),
      quantitySold: v.number(),
      revenue: v.number(),
    })),
    categoryPerformance: v.array(v.object({
      category: v.string(),
      sales: v.number(),
      profit: v.number(),
    })),
  })
    .index("by_date", ["date"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
