import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";

export const listMessages = query({
  args: { userId: v.id("users"), otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query("chat_messages").collect();
    
    // Filter messages between the two users
    const filtered = allMessages.filter(
      (m) =>
        (m.sender_id === args.userId && m.receiver_id === args.otherUserId) ||
        (m.sender_id === args.otherUserId && m.receiver_id === args.userId)
    );

    // Sort by id / creation time
    filtered.sort((a, b) => a.created_at.localeCompare(b.created_at));

    const joined = [];
    for (const msg of filtered) {
      let productInfo = {};
      if (msg.product_id) {
        const prod = await ctx.db.get(msg.product_id);
        if (prod) {
          productInfo = {
            product_name: prod.name,
            product_model: prod.model,
            product_current_stock: prod.current_stock,
          };
        }
      }
      joined.push({
        ...msg,
        id: msg._id, // match traditional numeric id structure or client expectations
        ...productInfo,
      });
    }

    return joined;
  },
});

export const getContacts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query("chat_messages").collect();
    
    // Filter messages where user is sender or receiver
    const userMessages = allMessages.filter(
      (m) => m.sender_id === args.userId || m.receiver_id === args.userId
    );

    if (userMessages.length === 0) {
      return [];
    }

    // Sort chronologically to get the latest messages last
    userMessages.sort((a, b) => a.created_at.localeCompare(b.created_at));

    const groupedMap = new Map();
    for (const msg of userMessages) {
      const otherUserId = msg.sender_id === args.userId ? msg.receiver_id : msg.sender_id;
      let info = groupedMap.get(otherUserId);
      if (!info) {
        info = {
          last_message: "",
          last_message_time: "",
          unread_count: 0,
        };
        groupedMap.set(otherUserId, info);
      }
      info.last_message = msg.message;
      info.last_message_time = msg.created_at;

      if (msg.receiver_id === args.userId && !msg.is_read) {
        info.unread_count += 1;
      }
    }

    const contacts = [];
    for (const [otherId, info] of groupedMap.entries()) {
      const otherUser = await ctx.db.get(otherId);
      if (otherUser) {
        contacts.push({
          id: otherUser._id,
          username: otherUser.username,
          role: otherUser.role,
          last_message: info.last_message,
          last_message_time: info.last_message_time,
          unread_count: info.unread_count,
        });
      }
    }

    // Sort by last_message_time descending
    contacts.sort((a, b) => b.last_message_time.localeCompare(a.last_message_time));
    return contacts;
  },
});

export const insert = mutation({
  args: {
    sender_id: v.id("users"),
    receiver_id: v.id("users"),
    message: v.string(),
    product_id: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    // Validate receiver exists
    const receiver = await ctx.db.get(args.receiver_id);
    if (!receiver) {
      throw new Error("Receiver user not found");
    }

    // Validate product exists if specified
    if (args.product_id) {
      const product = await ctx.db.get(args.product_id);
      if (!product) {
        throw new Error("Product tag not found");
      }
    }

    const messageId = await ctx.db.insert("chat_messages", {
      sender_id: args.sender_id,
      receiver_id: args.receiver_id,
      message: args.message,
      product_id: args.product_id,
      created_at: new Date().toISOString(),
      is_read: false,
    });

    return messageId;
  },
});

export const markAsRead = mutation({
  args: { senderId: v.id("users"), receiverId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("chat_messages")
      .withIndex("by_sender_id", (q) => q.eq("sender_id", args.senderId))
      .collect();

    for (const msg of unread) {
      if (msg.receiver_id === args.receiverId && !msg.is_read) {
        await ctx.db.patch(msg._id, { is_read: true });
      }
    }

    return true;
  },
});
