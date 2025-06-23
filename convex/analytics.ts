import { v } from "convex/values";
import { query, mutation, internalMutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Get dashboard analytics
export const getDashboardAnalytics = query({
  args: {
    period: v.optional(v.string()), // "today", "week", "month", "year"
  },
  handler: async (ctx, args) => {
    const period = args.period || "today";
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const startTimestamp = startDate.getTime();

    // Get sales data
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startTimestamp))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startTimestamp))
      .collect();

    // Calculate totals
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalTransactions = transactions.length;

    // Top selling products
    const productSales = new Map();
    sales.forEach(sale => {
      const existing = productSales.get(sale.productId) || {
        productId: sale.productId,
        productName: sale.productName,
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += sale.quantity;
      existing.revenue += sale.totalAmount;
      productSales.set(sale.productId, existing);
    });

    const topSellingProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Category performance
    const categoryPerformance = new Map();
    sales.forEach(sale => {
      const existing = categoryPerformance.get(sale.category) || {
        category: sale.category,
        sales: 0,
        profit: 0,
      };
      existing.sales += sale.totalAmount;
      existing.profit += sale.profit;
      categoryPerformance.set(sale.category, existing);
    });

    const categoryData = Array.from(categoryPerformance.values())
      .sort((a, b) => b.sales - a.sales);

    // Low stock alerts
    const lowStockAlerts = await ctx.db
      .query("stockAlerts")
      .withIndex("by_resolved", (q) => q.eq("isResolved", false))
      .collect();

    // Sales trend (last 7 days)
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const daySales = sales.filter(sale => 
        sale.timestamp >= dayStart && sale.timestamp < dayEnd
      );

      salesTrend.push({
        date: date.toISOString().split('T')[0],
        sales: daySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        transactions: daySales.length,
      });
    }

    return {
      totalSales,
      totalProfit,
      totalTransactions,
      topSellingProducts,
      categoryPerformance: categoryData,
      lowStockAlerts,
      salesTrend,
    };
  },
});

// Get stock alerts
export const getStockAlerts = query({
  args: {
    resolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.resolved !== undefined) {
      return await ctx.db
        .query("stockAlerts")
        .withIndex("by_resolved", (q) => q.eq("isResolved", args.resolved!))
        .order("desc")
        .collect();
    } else {
      return await ctx.db.query("stockAlerts").order("desc").collect();
    }
  },
});

// Resolve stock alert
export const resolveStockAlert = mutation({
  args: { alertId: v.id("stockAlerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { isResolved: true });
    return args.alertId;
  },
});

// Update daily analytics (internal)
export const updateDailyAnalytics = internalMutation({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const startOfDay = new Date(args.date + "T00:00:00.000Z").getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Get sales for the day
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startOfDay))
      .filter((q) => q.lt(q.field("timestamp"), endOfDay))
      .collect();

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startOfDay))
      .filter((q) => q.lt(q.field("timestamp"), endOfDay))
      .collect();

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalTransactions = transactions.length;

    // Top selling products for the day
    const productSales = new Map();
    sales.forEach(sale => {
      const existing = productSales.get(sale.productId) || {
        productId: sale.productId,
        productName: sale.productName,
        quantitySold: 0,
        revenue: 0,
      };
      existing.quantitySold += sale.quantity;
      existing.revenue += sale.totalAmount;
      productSales.set(sale.productId, existing);
    });

    const topSellingProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Category performance
    const categoryPerformance = new Map();
    sales.forEach(sale => {
      const existing = categoryPerformance.get(sale.category) || {
        category: sale.category,
        sales: 0,
        profit: 0,
      };
      existing.sales += sale.totalAmount;
      existing.profit += sale.profit;
      categoryPerformance.set(sale.category, existing);
    });

    const categoryData = Array.from(categoryPerformance.values());

    // Check if analytics for this date already exists
    const existingAnalytics = await ctx.db
      .query("analytics")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    const analyticsData = {
      date: args.date,
      totalSales,
      totalProfit,
      totalTransactions,
      topSellingProducts,
      categoryPerformance: categoryData,
    };

    if (existingAnalytics) {
      await ctx.db.patch(existingAnalytics._id, analyticsData);
    } else {
      await ctx.db.insert("analytics", analyticsData);
    }
  },
});

// AI-powered sales forecasting
export const generateSalesForecast = action({
  args: {
    productId: v.optional(v.id("products")),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    
    // Get historical sales data
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const historicalSales = args.productId 
      ? await ctx.runQuery(api.sales.getSalesByProduct, {
          productId: args.productId,
          startDate: thirtyDaysAgo,
        })
      : await ctx.runQuery(api.sales.getSalesHistory, {
          startDate: thirtyDaysAgo,
        });

    // Simple moving average forecast
    const dailySales = new Map<string, number>();
    historicalSales.forEach((sale: any) => {
      const date = new Date(sale.timestamp).toISOString().split('T')[0];
      const existing = dailySales.get(date) || 0;
      dailySales.set(date, existing + sale.quantity);
    });

    const salesArray = Array.from(dailySales.values());
    const avgDailySales = salesArray.reduce((sum, val) => sum + val, 0) / salesArray.length || 0;

    // Generate forecast
    const forecast = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = forecastDate.getDay();
      
      // Apply weekly seasonality (weekends typically have different patterns)
      let seasonalityFactor = 1;
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        seasonalityFactor = 0.8;
      } else if (dayOfWeek === 5) { // Friday
        seasonalityFactor = 1.2;
      }

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedSales: Math.round(avgDailySales * seasonalityFactor),
        confidence: 0.75, // Simple confidence score
      });
    }

    return {
      forecast,
      historicalAverage: avgDailySales,
      dataPoints: salesArray.length,
    };
  },
});

// AI-powered reorder suggestions
export const getReorderSuggestions = action({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    // Get all products with low stock
    const products: any[] = await ctx.runQuery(api.products.getProducts, {});
    const lowStockProducts = products.filter((p: any) => p.quantity <= p.minStockLevel && p.isActive);

    const suggestions: any[] = [];

    for (const product of lowStockProducts) {
      // Get sales history for this product
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const sales: any[] = await ctx.runQuery(api.sales.getSalesByProduct, {
        productId: product._id,
        startDate: thirtyDaysAgo,
      });

      const totalSold = sales.reduce((sum: number, sale: any) => sum + sale.quantity, 0);
      const avgDailySales = totalSold / 30;
      
      // Calculate suggested reorder quantity (30 days supply + safety stock)
      const suggestedQuantity = Math.ceil(avgDailySales * 30 * 1.2); // 20% safety stock

      suggestions.push({
        productId: product._id,
        productName: product.name,
        currentStock: product.quantity,
        minStockLevel: product.minStockLevel,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        suggestedReorderQuantity: suggestedQuantity,
        urgency: product.quantity === 0 ? "critical" : "high",
        supplier: product.supplier,
      });
    }

    return suggestions.sort((a, b) => {
      if (a.urgency === "critical" && b.urgency !== "critical") return -1;
      if (b.urgency === "critical" && a.urgency !== "critical") return 1;
      return b.avgDailySales - a.avgDailySales;
    });
  },
});
