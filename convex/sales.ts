import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Process a sale transaction
export const processSale = mutation({
  args: {
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
    })),
    customerId: v.optional(v.string()),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const transactionItems = [];
    let totalAmount = 0;
    let totalProfit = 0;

    // Process each item
    for (const item of args.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
      }

      const itemTotal = product.price * item.quantity;
      const itemProfit = (product.price - product.costPrice) * item.quantity;

      // Update product stock
      await ctx.runMutation(api.products.updateStock, {
        productId: item.productId,
        quantityChange: -item.quantity,
      });

      // Record individual sale
      await ctx.db.insert("sales", {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalAmount: itemTotal,
        profit: itemProfit,
        customerId: args.customerId,
        timestamp: Date.now(),
        category: product.category,
      });

      transactionItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        totalAmount: itemTotal,
      });

      totalAmount += itemTotal;
      totalProfit += itemProfit;
    }

    // Record transaction
    const transactionId = await ctx.db.insert("transactions", {
      items: transactionItems,
      totalAmount,
      totalProfit,
      customerId: args.customerId,
      timestamp: Date.now(),
      paymentMethod: args.paymentMethod,
    });

    // Update daily analytics
    await ctx.scheduler.runAfter(0, internal.analytics.updateDailyAnalytics, {
      date: new Date().toISOString().split('T')[0],
    });

    return {
      transactionId,
      totalAmount,
      totalProfit,
      items: transactionItems,
    };
  },
});

// Get sales history
export const getSalesHistory = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("sales").withIndex("by_timestamp");
    
    if (args.startDate !== undefined) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    }
    
    if (args.endDate !== undefined) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));
    }

    return await query
      .order("desc")
      .take(args.limit || 100);
  },
});

// Get transactions history
export const getTransactions = query({
  args: {
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("transactions").withIndex("by_timestamp");
    
    if (args.startDate !== undefined) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    }
    
    if (args.endDate !== undefined) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));
    }

    return await query
      .order("desc")
      .take(args.limit || 50);
  },
});

// Get sales by product
export const getSalesByProduct = query({
  args: {
    productId: v.id("products"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("sales")
      .withIndex("by_product", (q) => q.eq("productId", args.productId));
    
    if (args.startDate !== undefined) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    }
    
    if (args.endDate !== undefined) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));
    }

    return await query.collect();
  },
});
