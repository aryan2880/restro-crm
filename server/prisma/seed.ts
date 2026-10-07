import { PrismaClient, Role, RestaurantStatus, SubscriptionPlan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data for clean seed...');
  await prisma.review.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.restaurantSettings.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  console.log('Creating Super Admin...');
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@platepulse.com',
      passwordHash: adminPasswordHash,
      name: 'System Super Admin',
      phone: '+91 98765 00000',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('Creating Restaurant 1: The Grand Bistro...');
  const grandBistro = await prisma.restaurant.create({
    data: {
      name: 'The Grand Bistro',
      slug: 'grand-bistro',
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop&q=80',
      address: 'Shop 12-14, Heritage Avenue, Connaught Place, New Delhi',
      phone: '+91 11 4567 8900',
      email: 'contact@grandbistro.com',
      website: 'https://grandbistro.com',
      openingHours: '11:00 AM - 11:30 PM',
      gstNumber: '07AABCU9603R1ZX',
      taxPercentage: 5.0,
      currency: '₹',
      googleReviewUrl: 'https://g.page/r/sample-grand-bistro/review',
      description: 'Finest gourmet dining experience serving contemporary artisanal cuisine with authentic flavours and curated hospitality.',
      status: RestaurantStatus.ACTIVE,
      settings: {
        create: {
          enableKdsSound: true,
          serviceChargePercent: 0.0,
          receiptFooter: 'Thank you for dining with The Grand Bistro! Please visit again.',
          autoAcceptOrders: false,
        },
      },
      subscription: {
        create: {
          plan: SubscriptionPlan.PRO,
          status: 'ACTIVE',
          maxTables: 50,
          maxOrdersPerMonth: 5000,
        },
      },
    },
  });

  const gbBranch = await prisma.branch.create({
    data: {
      restaurantId: grandBistro.id,
      name: 'Main Heritage Dining',
      address: 'Connaught Place, New Delhi',
      phone: '+91 11 4567 8900',
      isDefault: true,
    },
  });

  console.log('Creating staff users for The Grand Bistro...');
  const ownerPasswordHash = await bcrypt.hash('Owner123!', 10);
  const managerPasswordHash = await bcrypt.hash('Manager123!', 10);
  const kitchenPasswordHash = await bcrypt.hash('Kitchen123!', 10);
  const waiterPasswordHash = await bcrypt.hash('Waiter123!', 10);

  const gbOwner = await prisma.user.create({
    data: {
      email: 'owner@grandbistro.com',
      passwordHash: ownerPasswordHash,
      name: 'Vikramaditya Roy',
      phone: '+91 98111 22233',
      role: Role.RESTAURANT_OWNER,
      restaurantId: grandBistro.id,
      isActive: true,
    },
  });
  await prisma.staff.create({
    data: {
      userId: gbOwner.id,
      branchId: gbBranch.id,
      roleTitle: 'Proprietor & Managing Director',
    },
  });

  const gbManager = await prisma.user.create({
    data: {
      email: 'manager@grandbistro.com',
      passwordHash: managerPasswordHash,
      name: 'Priya Sharma',
      phone: '+91 98222 33344',
      role: Role.RESTAURANT_MANAGER,
      restaurantId: grandBistro.id,
      isActive: true,
    },
  });
  await prisma.staff.create({
    data: {
      userId: gbManager.id,
      branchId: gbBranch.id,
      roleTitle: 'General Manager',
    },
  });

  const gbKitchen = await prisma.user.create({
    data: {
      email: 'kitchen@grandbistro.com',
      passwordHash: kitchenPasswordHash,
      name: 'Chef Rajesh Khanna',
      phone: '+91 98333 44455',
      role: Role.KITCHEN_STAFF,
      restaurantId: grandBistro.id,
      isActive: true,
    },
  });
  await prisma.staff.create({
    data: {
      userId: gbKitchen.id,
      branchId: gbBranch.id,
      roleTitle: 'Head Chef',
    },
  });

  const gbWaiter = await prisma.user.create({
    data: {
      email: 'waiter@grandbistro.com',
      passwordHash: waiterPasswordHash,
      name: 'Aman Verma',
      phone: '+91 98444 55566',
      role: Role.WAITER,
      restaurantId: grandBistro.id,
      isActive: true,
    },
  });
  await prisma.staff.create({
    data: {
      userId: gbWaiter.id,
      branchId: gbBranch.id,
      roleTitle: 'Floor Captain',
    },
  });

  console.log('Creating Tables for The Grand Bistro...');
  const tablesData = [
    { tableNumber: 'T-01', capacity: 2 },
    { tableNumber: 'T-02', capacity: 4 },
    { tableNumber: 'T-03', capacity: 4 },
    { tableNumber: 'T-04', capacity: 6 },
    { tableNumber: 'T-05', capacity: 2 },
    { tableNumber: 'T-06', capacity: 8 },
  ];

  for (const t of tablesData) {
    await prisma.table.create({
      data: {
        restaurantId: grandBistro.id,
        branchId: gbBranch.id,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        isActive: true,
        qrCodeUrl: `/menu/grand-bistro?table=${t.tableNumber}`,
      },
    });
  }

  console.log('Creating Categories for The Grand Bistro...');
  const catStarters = await prisma.category.create({
    data: {
      restaurantId: grandBistro.id,
      name: 'Starters & Appetizers',
      description: 'Handcrafted bites and sizzling tandoori delicacies',
      displayOrder: 1,
    },
  });

  const catMains = await prisma.category.create({
    data: {
      restaurantId: grandBistro.id,
      name: 'Main Course',
      description: 'Rich royal gravies, traditional curries, and hearth breads',
      displayOrder: 2,
    },
  });

  const catPizza = await prisma.category.create({
    data: {
      restaurantId: grandBistro.id,
      name: 'Artisan Pizzas & Pasta',
      description: 'Stone-baked sourdough crusts and freshly rolled pasta',
      displayOrder: 3,
    },
  });

  const catBeverages = await prisma.category.create({
    data: {
      restaurantId: grandBistro.id,
      name: 'Beverages & Mocktails',
      description: 'Refreshing artisanal coolers, shakes, and brewed coffees',
      displayOrder: 4,
    },
  });

  const catDesserts = await prisma.category.create({
    data: {
      restaurantId: grandBistro.id,
      name: 'Gourmet Desserts',
      description: 'Sweet indulgences prepared fresh by our pastry artisans',
      displayOrder: 5,
    },
  });

  console.log('Creating Menu Items for The Grand Bistro...');
  const menuItems = [
    {
      categoryId: catStarters.id,
      name: 'Paneer Tikka Angara',
      description: 'Cottage cheese cubes marinated in Kashmiri chili and hung curd, roasted in clay tandoor with bell peppers.',
      price: 280,
      image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 15,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 1,
    },
    {
      categoryId: catStarters.id,
      name: 'Crispy Corn Salt & Pepper',
      description: 'Golden sweet corn tossed with scallions, crushed black pepper, and toasted oriental spices.',
      price: 220,
      image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 12,
      isAvailable: true,
      isRecommended: false,
      displayOrder: 2,
    },
    {
      categoryId: catStarters.id,
      name: 'Chicken Seekh Kebab',
      description: 'Minced chicken spiced with fresh mint, coriander, and royal garam masala, skewer-grilled over charcoal.',
      price: 340,
      image: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=500&h=350&fit=crop&q=80',
      isVeg: false,
      prepTimeMinutes: 18,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 3,
    },
    {
      categoryId: catStarters.id,
      name: 'Garlic Butter Prawns',
      description: 'Tiger prawns pan-seared with French butter, roasted garlic slivers, and fresh Italian parsley.',
      price: 420,
      image: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=500&h=350&fit=crop&q=80',
      isVeg: false,
      prepTimeMinutes: 18,
      isAvailable: false, // OUT OF STOCK test
      isRecommended: false,
      displayOrder: 4,
    },
    {
      categoryId: catMains.id,
      name: 'Butter Chicken Grand Royale',
      description: 'Tender tandoori chicken simmered in a velvety reduction of sun-ripened tomatoes, butter, and cashews.',
      price: 380,
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&h=350&fit=crop&q=80',
      isVeg: false,
      prepTimeMinutes: 20,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 1,
    },
    {
      categoryId: catMains.id,
      name: 'Dal Makhani Signature',
      description: 'Slow-cooked black lentils simmered overnight for 24 hours with churned butter and mild spices.',
      price: 260,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 15,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 2,
    },
    {
      categoryId: catMains.id,
      name: 'Paneer Butter Masala',
      description: 'Fresh malai paneer simmered in mildly spiced creamy tomato gravy scented with dried fenugreek leaves.',
      price: 310,
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 18,
      isAvailable: true,
      isRecommended: false,
      displayOrder: 3,
    },
    {
      categoryId: catMains.id,
      name: 'Garlic Butter Naan',
      description: 'Traditional leavened flatbread freshly baked in tandoor, brushed with aromatic garlic herb butter.',
      price: 60,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 8,
      isAvailable: true,
      isRecommended: false,
      displayOrder: 4,
    },
    {
      categoryId: catPizza.id,
      name: 'Margherita Fresca Pizza',
      description: 'San Marzano tomato base, fresh buffalo mozzarella fior di latte, extra virgin olive oil, and sweet basil.',
      price: 360,
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 20,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 1,
    },
    {
      categoryId: catPizza.id,
      name: 'Smoked BBQ Chicken Pizza',
      description: 'Hickory smoked chicken chunks, red onions, charred bell peppers, mozzarella, and house barbecue drizzle.',
      price: 450,
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=350&fit=crop&q=80',
      isVeg: false,
      prepTimeMinutes: 20,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 2,
    },
    {
      categoryId: catBeverages.id,
      name: 'Mint Lime Fizz Cooler',
      description: 'Fresh muddled mint leaves, lime juice, brown sugar, and effervescent sparkling soda.',
      price: 140,
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 5,
      isAvailable: true,
      isRecommended: false,
      displayOrder: 1,
    },
    {
      categoryId: catBeverages.id,
      name: 'Alphonso Mango Lassi',
      description: 'Creamy yogurt blended with pure Ratnagiri Alphonso mango pulp and fragrant green cardamom.',
      price: 160,
      image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 5,
      isAvailable: false, // OUT OF STOCK test
      isRecommended: false,
      displayOrder: 2,
    },
    {
      categoryId: catDesserts.id,
      name: 'Sizzling Hot Walnut Brownie',
      description: 'Fudgy dark chocolate walnut brownie served on a cast iron skillet with artisanal vanilla bean gelato.',
      price: 240,
      image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=500&h=350&fit=crop&q=80',
      isVeg: true,
      prepTimeMinutes: 10,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 1,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        restaurantId: grandBistro.id,
        ...item,
      },
    });
  }

  console.log('Creating Restaurant 2 (for multi-tenant isolation testing): Tokyo Ramen Bar...');
  const tokyoRamen = await prisma.restaurant.create({
    data: {
      name: 'Tokyo Ramen & Sushi Bar',
      slug: 'tokyo-ramen',
      logo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&h=400&fit=crop&q=80',
      address: '42 Zen Boulevard, Bandra West, Mumbai',
      phone: '+91 22 8888 9999',
      email: 'hello@tokyoramen.com',
      website: 'https://tokyoramen.jp',
      openingHours: '12:00 PM - 10:30 PM',
      gstNumber: '27AABCU1111R1Z1',
      taxPercentage: 5.0,
      currency: '₹',
      googleReviewUrl: 'https://g.page/r/sample-tokyo-ramen/review',
      description: 'Authentic Hakata tonkotsu ramen and Tokyo nigiri sushi bar.',
      status: RestaurantStatus.ACTIVE,
      settings: {
        create: {
          enableKdsSound: true,
          receiptFooter: 'Arigato Gozaimasu! Visit Tokyo Ramen again.',
        },
      },
      subscription: {
        create: {
          plan: SubscriptionPlan.STARTER,
          status: 'ACTIVE',
          maxTables: 20,
          maxOrdersPerMonth: 2000,
        },
      },
    },
  });

  const trBranch = await prisma.branch.create({
    data: {
      restaurantId: tokyoRamen.id,
      name: 'Bandra Flagship',
      address: 'Bandra West, Mumbai',
      phone: '+91 22 8888 9999',
      isDefault: true,
    },
  });

  const trOwner = await prisma.user.create({
    data: {
      email: 'owner@tokyoramen.com',
      passwordHash: ownerPasswordHash,
      name: 'Kenji Sato',
      phone: '+91 99999 00011',
      role: Role.RESTAURANT_OWNER,
      restaurantId: tokyoRamen.id,
      isActive: true,
    },
  });
  await prisma.staff.create({
    data: {
      userId: trOwner.id,
      branchId: trBranch.id,
      roleTitle: 'Owner & Sensei',
    },
  });

  const trTable = await prisma.table.create({
    data: {
      restaurantId: tokyoRamen.id,
      branchId: trBranch.id,
      tableNumber: 'Table A1',
      capacity: 4,
      isActive: true,
      qrCodeUrl: '/menu/tokyo-ramen?table=Table A1',
    },
  });

  const trCategory = await prisma.category.create({
    data: {
      restaurantId: tokyoRamen.id,
      name: 'Ramen Bowls',
      description: '18-hour broth tonkotsu ramen with springy handmade noodles',
      displayOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: tokyoRamen.id,
      categoryId: trCategory.id,
      name: 'Signature Tonkotsu Ramen',
      description: 'Rich pork bone broth, tender chashu, seasoned ajitsuke tamago, bamboo shoots, and scallions.',
      price: 490,
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&h=350&fit=crop&q=80',
      isVeg: false,
      prepTimeMinutes: 15,
      isAvailable: true,
      isRecommended: true,
      displayOrder: 1,
    },
  });

  console.log('Seeding completed successfully!');
  console.log('--- CREDENTIALS ---');
  console.log('SUPER ADMIN:      admin@platepulse.com / AdminPassword123!');
  console.log('GRAND BISTRO OWNER:    owner@grandbistro.com / Owner123!');
  console.log('GRAND BISTRO MANAGER:  manager@grandbistro.com / Manager123!');
  console.log('GRAND BISTRO KITCHEN:  kitchen@grandbistro.com / Kitchen123!');
  console.log('GRAND BISTRO WAITER:   waiter@grandbistro.com / Waiter123!');
  console.log('TOKYO RAMEN OWNER:     owner@tokyoramen.com / Owner123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
