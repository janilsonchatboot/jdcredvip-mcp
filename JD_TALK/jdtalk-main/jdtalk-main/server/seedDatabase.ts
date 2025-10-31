import { db } from "./db";
import {
  users,
  customers,
  conversations,
  messages,
  tickets,
  orders
} from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seeds the database with initial data
 */
export async function seedDatabase() {
  console.log("Seeding database...");
  
  try {
    // Check if database already has data
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("Database already has data. Skipping seed process.");
      return;
    }
    
    // Create initial agent user
    const [agent] = await db.insert(users).values({
      username: "agent",
      displayName: "Support Agent",
      password: "agent123",
      role: "agent"
    }).returning();
    console.log("Created agent:", agent.username);
    
    // Create sample customer
    const [customer] = await db.insert(customers).values({
      phoneNumber: "+15551234567",
      name: "Tom Wilson",
      email: "tom@example.com",
      customerSince: new Date(2023, 0, 15),
      whatsappId: "15551234567"
    }).returning();
    console.log("Created customer:", customer.name);
    
    // Create sample conversation
    const [conversation] = await db.insert(conversations).values({
      customerId: customer.id,
      lastMessageAt: new Date(),
      unreadCount: 0
    }).returning();
    console.log("Created conversation for customer:", customer.name);
    
    // Create sample messages
    await db.insert(messages).values([
      {
        conversationId: conversation.id,
        senderId: customer.whatsappId,
        senderType: "customer",
        content: "Hi there! I purchased an item last week and had a question about the refund policy.",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        status: "read"
      },
      {
        conversationId: conversation.id,
        senderId: agent.id.toString(),
        senderType: "agent",
        content: "Hello Tom! Thanks for reaching out. I'd be happy to clarify our refund policy for you.",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 7000000), // 1 hour 57 minutes ago
        status: "read"
      },
      {
        conversationId: conversation.id,
        senderId: customer.whatsappId,
        senderType: "customer",
        content: "Here's a screenshot of my order:",
        mediaType: "image",
        mediaUrl: "https://images.unsplash.com/photo-1621570071349-aa0668fb4572",
        timestamp: new Date(Date.now() - 5400000), // 1 hour 30 minutes ago
        status: "read"
      },
      {
        conversationId: conversation.id,
        senderId: agent.id.toString(),
        senderType: "agent",
        content: "I see the issue now. You can find our complete refund policy at this link: https://example.com/refund-policy",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 4680000), // 1 hour 18 minutes ago
        status: "read"
      },
      {
        conversationId: conversation.id,
        senderId: customer.whatsappId,
        senderType: "customer",
        content: null,
        mediaType: "audio",
        mediaUrl: "path/to/audio.mp3",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        status: "read"
      },
      {
        conversationId: conversation.id,
        senderId: agent.id.toString(),
        senderType: "agent",
        content: "Thanks for your voice message. I'll process your refund right away, and you should see it in your account within 3-5 business days.",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 2880000), // 48 minutes ago
        status: "read"
      },
      {
        conversationId: conversation.id,
        senderId: customer.whatsappId,
        senderType: "customer",
        content: "Thanks for your help with the refund!",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 2520000), // 42 minutes ago
        status: "read"
      }
    ]);
    console.log("Created sample messages");
    
    // Create ticket for the conversation
    await db.insert(tickets).values({
      conversationId: conversation.id,
      assignedToId: agent.id,
      status: "open",
      priority: "medium",
      createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      tags: ["refund", "customer-service"]
    });
    console.log("Created ticket for conversation");
    
    // Create some sample orders for the customer
    await db.insert(orders).values([
      {
        customerId: customer.id,
        orderNumber: "ORD12345",
        orderDate: new Date(2023, 3, 15), // April
        totalAmount: 149.99,
        status: "delivered",
        items: JSON.stringify([
          { productId: "PROD001", productName: "Smartphone Case", quantity: 1, price: 29.99 },
          { productId: "PROD002", productName: "Screen Protector", quantity: 2, price: 15.99 },
          { productId: "PROD003", productName: "Wireless Charger", quantity: 1, price: 88.02 }
        ])
      },
      {
        customerId: customer.id,
        orderNumber: "ORD12346",
        orderDate: new Date(2023, 3, 20), // April
        totalAmount: 799.99,
        status: "processing",
        items: JSON.stringify([
          { productId: "PROD004", productName: "Laptop", quantity: 1, price: 799.99 }
        ])
      }
    ]);
    console.log("Created sample orders");
    
    // Create another customer with conversation
    const [customer2] = await db.insert(customers).values({
      phoneNumber: "+15559876543",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      customerSince: new Date(2022, 9, 10), // Oct
      whatsappId: "15559876543"
    }).returning();
    console.log("Created second customer:", customer2.name);
    
    const [conversation2] = await db.insert(conversations).values({
      customerId: customer2.id,
      lastMessageAt: new Date(Date.now() - 1800000), // 30 minutes ago
      unreadCount: 2
    }).returning();
    
    await db.insert(messages).values([
      {
        conversationId: conversation2.id,
        senderId: customer2.whatsappId,
        senderType: "customer",
        content: "Hello, I'm having issues with my recent order #ORD54321.",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        status: "delivered"
      },
      {
        conversationId: conversation2.id,
        senderId: customer2.whatsappId,
        senderType: "customer",
        content: "Can you please help me track it? It's been a week since I ordered.",
        mediaType: null,
        mediaUrl: null,
        timestamp: new Date(Date.now() - 1780000), // 29 minutes 40 seconds ago
        status: "delivered"
      }
    ]);
    
    await db.insert(tickets).values({
      conversationId: conversation2.id,
      assignedToId: null, // Not assigned yet
      status: "new",
      priority: "high",
      createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
      tags: ["order-issue", "tracking"]
    });
    
    await db.insert(orders).values({
      customerId: customer2.id,
      orderNumber: "ORD54321",
      orderDate: new Date(Date.now() - 604800000), // 1 week ago
      totalAmount: 129.95,
      status: "shipped",
      items: JSON.stringify([
        { productId: "PROD005", productName: "Bluetooth Headphones", quantity: 1, price: 129.95 }
      ])
    });
    
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}