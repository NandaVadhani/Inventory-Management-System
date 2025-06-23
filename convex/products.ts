import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all products with optional filtering
export const getProducts = query({
  args: {
    category: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let products;
    
    if (args.category !== undefined) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }
    
    if (args.activeOnly) {
      return products.filter(p => p.isActive);
    }
    
    return products;
  },
});

// Search products
export const searchProducts = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_products", (q) => {
        let search = q.search("name", args.searchTerm);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        return search.eq("isActive", true);
      })
      .take(20);
    
    return results;
  },
});

// Get product by ID
export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Add new product (Admin only)
export const addProduct = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    // Check if SKU already exists
    const existingProduct = await ctx.db
      .query("products")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();
    
    if (existingProduct) {
      throw new Error("Product with this SKU already exists");
    }

    const productId = await ctx.db.insert("products", {
      ...args,
      isActive: true,
    });

    // Create stock alert if quantity is below minimum
    if (args.quantity <= args.minStockLevel) {
      await ctx.db.insert("stockAlerts", {
        productId,
        productName: args.name,
        currentStock: args.quantity,
        minStockLevel: args.minStockLevel,
        alertType: args.quantity === 0 ? "out_of_stock" : "low_stock",
        isResolved: false,
        createdAt: Date.now(),
      });
    }

    return productId;
  },
});

// Update product
// Update product
export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    quantity: v.optional(v.number()),
    category: v.optional(v.string()),
    supplier: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    description: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    minStockLevel: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sku: v.optional(v.string()), // ✅ Added this line
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const { id, ...updates } = args;
    const product = await ctx.db.get(id);
    
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if SKU is being changed to a new value that already exists
    if (updates.sku && updates.sku !== product.sku) {
      const existingProduct = await ctx.db
        .query("products")
        .withIndex("by_sku", (q) => q.eq("sku", updates.sku!))
        .first();

      if (existingProduct) {
        throw new Error("Another product with this SKU already exists");
      }
    }

    await ctx.db.patch(id, updates);

    // Check for stock alerts if quantity was updated
    if (updates.quantity !== undefined) {
      const minLevel = updates.minStockLevel ?? product.minStockLevel;
      
      if (updates.quantity <= minLevel) {
        const existingAlert = await ctx.db
          .query("stockAlerts")
          .withIndex("by_product", (q) => q.eq("productId", id))
          .filter((q) => q.eq(q.field("isResolved"), false))
          .first();

        if (!existingAlert) {
          await ctx.db.insert("stockAlerts", {
            productId: id,
            productName: updates.name ?? product.name,
            currentStock: updates.quantity,
            minStockLevel: minLevel,
            alertType: updates.quantity === 0 ? "out_of_stock" : "low_stock",
            isResolved: false,
            createdAt: Date.now(),
          });
        }
      } else {
        const alerts = await ctx.db
          .query("stockAlerts")
          .withIndex("by_product", (q) => q.eq("productId", id))
          .filter((q) => q.eq(q.field("isResolved"), false))
          .collect();

        for (const alert of alerts) {
          await ctx.db.patch(alert._id, { isResolved: true });
        }
      }
    }

    return id;
  },
});


// Delete product
export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const categories = [...new Set(products.map(p => p.category))];
    return categories.sort();
  },
});

// Update stock quantity (for purchases)
export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    quantityChange: v.number(), // negative for sales, positive for restocking
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const newQuantity = Math.max(0, product.quantity + args.quantityChange);
    await ctx.db.patch(args.productId, { quantity: newQuantity });

    // Check for stock alerts
    if (newQuantity <= product.minStockLevel) {
      const existingAlert = await ctx.db
        .query("stockAlerts")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .filter((q) => q.eq(q.field("isResolved"), false))
        .first();

      if (!existingAlert) {
        await ctx.db.insert("stockAlerts", {
          productId: args.productId,
          productName: product.name,
          currentStock: newQuantity,
          minStockLevel: product.minStockLevel,
          alertType: newQuantity === 0 ? "out_of_stock" : "low_stock",
          isResolved: false,
          createdAt: Date.now(),
        });
      }
    }

    return newQuantity;
  },
});
