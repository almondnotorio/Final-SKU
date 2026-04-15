import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "residential" },
      update: {},
      create: {
        name: "Residential Mailboxes",
        slug: "residential",
        description: "Standard mailboxes for single-family homes",
      },
    }),
    prisma.category.upsert({
      where: { slug: "community" },
      update: {},
      create: {
        name: "Community / Cluster",
        slug: "community",
        description: "Multi-unit cluster mailbox units for communities and apartments",
      },
    }),
    prisma.category.upsert({
      where: { slug: "commercial" },
      update: {},
      create: {
        name: "Commercial",
        slug: "commercial",
        description: "Heavy-duty mailboxes for commercial and business use",
      },
    }),
    prisma.category.upsert({
      where: { slug: "accessories" },
      update: {},
      create: {
        name: "Accessories & Parts",
        slug: "accessories",
        description: "Posts, hardware, locks, and replacement parts",
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create sample SKUs
  const skus = await Promise.all([
    prisma.sKU.upsert({
      where: { sku: "RES-CLAS-1001" },
      update: {},
      create: {
        sku: "RES-CLAS-1001",
        name: "Classic Residential Mailbox - Black",
        shortDescription: "Durable steel mailbox with powder coat finish for residential use",
        description:
          "Our most popular residential mailbox featuring heavy-gauge galvanized steel construction, weather-resistant powder coat finish, and a secure cam lock. Suitable for all standard residential mail delivery.",
        categoryId: categories[0].id,
        retailPrice: 49.99,
        wholesalePrice: 29.99,
        msrp: 59.99,
        status: "ACTIVE",
        stockQuantity: 250,
        width: 11.25,
        height: 7.5,
        depth: 19.5,
        weight: 4.2,
        color: "Black",
        material: "Galvanized Steel",
        finish: "Powder Coat",
        mountingType: "POST",
        numberOfDoors: 1,
        lockType: "Cam Lock",
        postalApproved: true,
        features: [
          "Heavy-gauge galvanized steel",
          "Weather-resistant powder coat",
          "USPS Postal approved",
          "Standard T3 cam lock included",
          "Easy post mounting",
        ],
        tags: ["residential", "black", "steel", "post-mounted", "popular"],
        createdBy: "seed",
      },
    }),
    prisma.sKU.upsert({
      where: { sku: "COM-CLU-4016" },
      update: {},
      create: {
        sku: "COM-CLU-4016",
        name: "16-Door Cluster Mailbox Unit",
        shortDescription: "USPS-approved 16-door community cluster mailbox for apartments and HOAs",
        description:
          "Commercial-grade cluster mailbox unit designed for apartments, condominiums, and HOA communities. Features 16 individual tenant compartments, a parcel locker, and a master USPS arrow lock for carrier access.",
        categoryId: categories[1].id,
        retailPrice: 1299.99,
        wholesalePrice: 899.99,
        msrp: 1499.99,
        status: "ACTIVE",
        stockQuantity: 35,
        width: 43.5,
        height: 44.0,
        depth: 17.5,
        weight: 118.0,
        color: "Sandstone",
        material: "Aluminum",
        finish: "Anodized",
        mountingType: "PEDESTAL",
        numberOfDoors: 16,
        lockType: "Arrow Lock + Tenant Cam Lock",
        postalApproved: true,
        features: [
          "16 individual tenant compartments",
          "1 parcel locker included",
          "USPS arrow lock for carrier access",
          "Heavy-duty aluminum construction",
          "Meets USPS STD-4C requirements",
          "Includes pedestal base",
        ],
        tags: ["community", "cluster", "apartment", "hoa", "4c", "aluminum", "16-door"],
        createdBy: "seed",
      },
    }),
    prisma.sKU.upsert({
      where: { sku: "COM-CLU-0800" },
      update: {},
      create: {
        sku: "COM-CLU-0800",
        name: "8-Door Cluster Mailbox Unit - Bronze",
        shortDescription: "Compact 8-door cluster mailbox unit in bronze finish",
        description: "Ideal for smaller communities and townhome developments needing a compact cluster mailbox solution.",
        categoryId: categories[1].id,
        retailPrice: 749.99,
        wholesalePrice: 519.99,
        status: "ACTIVE",
        stockQuantity: 42,
        width: 24.5,
        height: 44.0,
        depth: 17.5,
        weight: 68.0,
        color: "Bronze",
        material: "Aluminum",
        finish: "Anodized",
        mountingType: "PEDESTAL",
        numberOfDoors: 8,
        lockType: "Arrow Lock + Tenant Cam Lock",
        postalApproved: true,
        features: [
          "8 tenant compartments",
          "USPS approved",
          "Bronze anodized finish",
          "Pedestal base included",
        ],
        tags: ["community", "cluster", "bronze", "8-door", "compact"],
        createdBy: "seed",
      },
    }),
  ]);

  console.log(`✅ Created ${skus.length} SKUs`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
