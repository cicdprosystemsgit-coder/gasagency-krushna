import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("Starting DB insertion test...");
  
  // Find an active agency
  const agency = await prisma.agency.findFirst({
    where: { status: "ACTIVE" }
  });
  if (!agency) {
    console.error("No active agency found!");
    return;
  }
  console.log("Using agency:", agency.name, "ID:", agency.id);

  // Find a vehicle
  const vehicle = await prisma.deliveryVehicle.findFirst({
    where: { agencyId: agency.id }
  });
  if (!vehicle) {
    console.error("No vehicle found!");
    return;
  }
  console.log("Using vehicle:", vehicle.vehicleNo, "ID:", vehicle.id);

  // Find a user
  const user = await prisma.user.findFirst({
    where: { agencyId: agency.id }
  });
  if (!user) {
    console.error("No user found!");
    return;
  }
  console.log("Using user:", user.name, "ID:", user.id);

  // Find a product
  const product = await prisma.product.findFirst({
    where: { agencyId: agency.id }
  });
  if (!product) {
    console.error("No product found!");
    return;
  }
  console.log("Using product:", product.name, "ID:", product.id);

  const mockItems = [
    {
      productId: product.id,
      productName: product.name,
      loaded: 10,
      unsoldReturned: 0,
      emptyReturned: 0
    }
  ];

  try {
    const tripLog = await prisma.vehicleTripLog.create({
      data: {
        vehicleId: vehicle.id,
        date: new Date(),
        cylindersLoaded: 10,
        cylindersReturned: 0,
        cylindersDelivered: 0,
        items: mockItems,
        departureTime: new Date(),
        returnTime: null,
        tripStatus: "LOADED",
        notes: "Test mock insertion",
        recordedById: user.id,
        agencyId: agency.id,
      }
    });
    console.log("Success! Created trip log with ID:", tripLog.id);
  } catch (err) {
    console.error("Failed to insert trip log:", err);
  }
}

main().catch(console.error);
