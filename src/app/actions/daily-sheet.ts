"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface DailySheetProductRow {
  productId: string;
  productName: string;
  isCylinder: boolean;
  allocatedQty: number;      // Total loaded/assigned to delivery vehicles/boys today
  deliveredQty: number;      // Column 1: Delivered
  emptyReturnQty: number;    // Column 2: Empty Return
  fullReturnQty: number;     // Column 3: Full Return (unsold)
  totalAccountedQty: number; // Column 4: Empty Return + Full Return
  shortQty: number;          // Column 5: Allocated - Total Accounted
  status: "BALANCED" | "SHORT" | "SURPLUS";
}

export interface DriverVehicleReconciliation {
  tripId: string;
  vehicleNo: string;
  vehicleName: string;
  deliveryBoyId: string | null;
  deliveryBoyName: string;
  tripStatus: string;
  departureTime: string | null;
  returnTime: string | null;
  totalAllocated: number;
  totalDelivered: number;
  totalEmptyReturned: number;
  totalFullReturned: number;
  totalAccounted: number;
  totalShort: number;
  items: Array<{
    productId: string;
    productName: string;
    allocated: number;
    delivered: number;
    emptyReturned: number;
    fullReturned: number;
    totalAccounted: number;
    short: number;
  }>;
}

export interface CustomerPendingItem {
  id: string; // DeliveryRecord id
  customerId: string;
  customerName: string;
  customerCode: string | null;
  phone: string;
  address: string | null;
  productId: string;
  productName: string;
  deliveredQty: number;
  returnedQty: number;
  pendingEmptyQty: number; // deliveredQty - returnedQty
  paymentMode: string;
  cashCollected: number;
  creditAmount: number;
  status: string;
  notes: string | null;
  time: string;
}

export interface DeliveryBoyProductBreakdown {
  productId: string;
  productName: string;
  loadedQty: number;          // Assigned / loaded filled cylinders
  deliveredQty: number;       // Delivered to customers
  fullReturnQty: number;      // Unsold filled cylinders returned
  emptyReturnQty: number;     // Empty cylinders brought back to godown
  customerPendingQty: number; // Cylinders delivered where customer did not return empty
  totalAccountedQty: number;  // fullReturnQty + emptyReturnQty + customerPendingQty
  shortQty: number;           // Discrepancy / Missing cylinders with Delivery Boy
  status: "BALANCED" | "SHORT" | "SURPLUS";
}

export interface DeliveryBoyReconciliation {
  deliveryBoyId: string;
  deliveryBoyName: string;
  deliveryBoyPhone?: string | null;
  vehicleId: string | null;
  vehicleNo: string;
  vehicleName: string;
  vehicleType: string;
  tripId: string | null;
  tripStatus: string; // LOADED | OUT_FOR_DELIVERY | RETURNED | PARTIAL_RETURN | NO_TRIP
  departureTime: string | null;
  returnTime: string | null;

  // Summary totals for this delivery boy
  totalLoaded: number;
  totalDelivered: number;
  totalFullReturned: number;
  totalEmptyReturned: number;
  totalCustomerPending: number;
  totalAccounted: number;
  totalShort: number; // Added to pending cylinders for that specific delivery boy!
  status: "BALANCED" | "SHORT" | "SURPLUS";

  // Financial totals for this delivery boy
  totalCashCollected: number;
  totalCreditAmount: number;

  // Breakdown per product
  products: DeliveryBoyProductBreakdown[];

  // Real-time connected list of customer deliveries and pending empty cylinders
  customerDeliveries: CustomerPendingItem[];
  pendingCustomers: CustomerPendingItem[];
}

export interface DailySheetData {
  date: string;
  status: "OPEN" | "SAVED" | "LOCKED";
  savedAt: string | null;
  savedBy: string | null;
  notes: string | null;
  summary: {
    totalAllocated: number;
    totalDelivered: number;
    totalEmptyReturned: number;
    totalFullReturned: number;
    totalAccounted: number;
    totalShort: number;
    activeTrips: number;
    completedTrips: number;
    totalCustomerPending: number;
    totalBoyShortage: number;
  };
  productRows: DailySheetProductRow[];
  driverTrips: DriverVehicleReconciliation[];
  deliveryBoyReconciliations: DeliveryBoyReconciliation[];
  allPendingCustomers: CustomerPendingItem[];
}

export async function getDailySheetData(dateStr: string): Promise<DailySheetData | { error: string }> {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return { error: "Unauthorized" };
    }

    const agencyId = session.agencyId;
    const targetDate = new Date(dateStr);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Fetch agency cylinder products
    const products = await prisma.product.findMany({
      where: { agencyId, isActive: true, isDeleted: false },
      select: {
        id: true,
        name: true,
        isCylinder: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    // 2. Fetch all internal vehicle trip logs for selected date
    const tripLogs = await prisma.vehicleTripLog.findMany({
      where: {
        agencyId,
        date: { gte: dayStart, lte: dayEnd },
        isDeleted: false,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            vehicleNo: true,
            vehicleName: true,
            vehicleType: true,
            assignedToId: true,
            assignedTo: { select: { id: true, name: true, phone: true } },
          },
        },
        recordedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch all agency internal delivery vehicles
    const agencyVehicles = await prisma.deliveryVehicle.findMany({
      where: { agencyId },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true } },
      },
    });

    // 4. Fetch customer delivery records for real-time connection
    const deliveryRecords = await prisma.deliveryRecord.findMany({
      where: {
        agencyId,
        date: { gte: dayStart, lte: dayEnd },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            customerCode: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveredBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 5. Fetch existing DailyStockRegister to check if sheet was saved
    const register = await prisma.dailyStockRegister.findFirst({
      where: { agencyId, date: dayStart },
    });

    // 6. Aggregate by Driver/Vehicle for Tab 1 & summary
    const driverTrips: DriverVehicleReconciliation[] = [];
    const productAggregation: Record<
      string,
      {
        allocated: number;
        delivered: number;
        emptyReturned: number;
        fullReturned: number;
      }
    > = {};

    // Initialize productAggregation for all products
    for (const p of products) {
      productAggregation[p.id] = {
        allocated: 0,
        delivered: 0,
        emptyReturned: 0,
        fullReturned: 0,
      };
    }

    for (const t of tripLogs) {
      let tripItems: any[] = [];
      if (t.items) {
        try {
          tripItems = typeof t.items === "string" ? JSON.parse(t.items) : (t.items as any[]);
        } catch {
          tripItems = [];
        }
      }

      const driverItems: DriverVehicleReconciliation["items"] = [];
      let tripAllocated = 0;
      let tripDelivered = 0;
      let tripEmptyReturned = 0;
      let tripFullReturned = 0;

      if (Array.isArray(tripItems) && tripItems.length > 0) {
        for (const it of tripItems) {
          const pId = it.productId;
          const pName = it.productName || "Cylinder";
          const allocated = Number(it.loaded) || 0;
          const emptyRet = Number(it.emptyReturned) || 0;
          const fullRet = Number(it.unsoldReturned) || 0;
          const delivered = emptyRet > 0 ? emptyRet : Math.max(0, allocated - fullRet);
          const totalAcc = emptyRet + fullRet;
          const short = allocated - totalAcc;

          tripAllocated += allocated;
          tripDelivered += delivered;
          tripEmptyReturned += emptyRet;
          tripFullReturned += fullRet;

          driverItems.push({
            productId: pId,
            productName: pName,
            allocated,
            delivered,
            emptyReturned: emptyRet,
            fullReturned: fullRet,
            totalAccounted: totalAcc,
            short,
          });

          if (!productAggregation[pId]) {
            productAggregation[pId] = { allocated: 0, delivered: 0, emptyReturned: 0, fullReturned: 0 };
          }
          productAggregation[pId].allocated += allocated;
          productAggregation[pId].delivered += delivered;
          productAggregation[pId].emptyReturned += emptyRet;
          productAggregation[pId].fullReturned += fullRet;
        }
      } else if (t.cylindersLoaded > 0) {
        const defaultProd = products[0];
        const pId = defaultProd?.id ?? "unknown";
        const pName = defaultProd?.name ?? "Cylinder";
        const allocated = t.cylindersLoaded;
        const emptyRet = t.cylindersDelivered || 0;
        const fullRet = t.cylindersReturned || 0;
        const delivered = emptyRet > 0 ? emptyRet : Math.max(0, allocated - fullRet);
        const totalAcc = emptyRet + fullRet;
        const short = allocated - totalAcc;

        tripAllocated = allocated;
        tripDelivered = delivered;
        tripEmptyReturned = emptyRet;
        tripFullReturned = fullRet;

        driverItems.push({
          productId: pId,
          productName: pName,
          allocated,
          delivered,
          emptyReturned: emptyRet,
          fullReturned: fullRet,
          totalAccounted: totalAcc,
          short,
        });

        if (!productAggregation[pId]) {
          productAggregation[pId] = { allocated: 0, delivered: 0, emptyReturned: 0, fullReturned: 0 };
        }
        productAggregation[pId].allocated += allocated;
        productAggregation[pId].delivered += delivered;
        productAggregation[pId].emptyReturned += emptyRet;
        productAggregation[pId].fullReturned += fullRet;
      }

      const totalTripAccounted = tripEmptyReturned + tripFullReturned;
      const totalTripShort = tripAllocated - totalTripAccounted;

      driverTrips.push({
        tripId: t.id,
        vehicleNo: t.vehicle.vehicleNo,
        vehicleName: t.vehicle.vehicleName,
        deliveryBoyId: t.vehicle.assignedToId,
        deliveryBoyName: t.vehicle.assignedTo?.name || "Unassigned Driver",
        tripStatus: t.tripStatus,
        departureTime: t.departureTime ? new Date(t.departureTime).toISOString() : null,
        returnTime: t.returnTime ? new Date(t.returnTime).toISOString() : null,
        totalAllocated: tripAllocated,
        totalDelivered: tripDelivered,
        totalEmptyReturned: tripEmptyReturned,
        totalFullReturned: tripFullReturned,
        totalAccounted: totalTripAccounted,
        totalShort: totalTripShort,
        items: driverItems,
      });
    }

    // 7. Group customer deliveries by driver
    const deliveriesByDriver = new Map<string, typeof deliveryRecords>();
    const allPendingCustomers: CustomerPendingItem[] = [];

    for (const d of deliveryRecords) {
      const driverId = d.deliveredById || "unassigned";
      if (!deliveriesByDriver.has(driverId)) {
        deliveriesByDriver.set(driverId, []);
      }
      deliveriesByDriver.get(driverId)!.push(d);

      const pendingEmpty = d.pendingQty > 0 ? d.pendingQty : Math.max(0, (d.deliveredQty || 0) - (d.returnedQty || 0));
      const customerItem: CustomerPendingItem = {
        id: d.id,
        customerId: d.customerId,
        customerName: d.customer?.name || "Customer",
        customerCode: d.customer?.customerCode || null,
        phone: d.customer?.phone || "-",
        address: d.customer?.address || null,
        productId: d.productId,
        productName: d.product?.name || d.productName || "Cylinder",
        deliveredQty: d.deliveredQty || 0,
        returnedQty: d.returnedQty || 0,
        pendingEmptyQty: pendingEmpty,
        paymentMode: d.paymentMode || "CASH",
        cashCollected: d.cashCollected || 0,
        creditAmount: d.creditAmount || 0,
        status: d.status || "DELIVERED",
        notes: d.notes || null,
        time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-",
      };

      if (pendingEmpty > 0) {
        allPendingCustomers.push(customerItem);
      }
    }

    // 8. Build Comprehensive Delivery Boy Reconciliation (Sheet 2)
    // Gather all distinct delivery boy identities active today
    const driverMap = new Map<
      string,
      {
        deliveryBoyId: string;
        deliveryBoyName: string;
        deliveryBoyPhone?: string | null;
        vehicleId: string | null;
        vehicleNo: string;
        vehicleName: string;
        vehicleType: string;
        trip: typeof tripLogs[0] | null;
      }
    >();

    // From Trip Logs
    for (const t of tripLogs) {
      const boyId = t.vehicle.assignedToId || `vehicle-${t.vehicle.id}`;
      const boyName = t.vehicle.assignedTo?.name || `Vehicle ${t.vehicle.vehicleNo}`;
      const boyPhone = t.vehicle.assignedTo?.phone || null;

      driverMap.set(boyId, {
        deliveryBoyId: boyId,
        deliveryBoyName: boyName,
        deliveryBoyPhone: boyPhone,
        vehicleId: t.vehicle.id,
        vehicleNo: t.vehicle.vehicleNo,
        vehicleName: t.vehicle.vehicleName,
        vehicleType: t.vehicle.vehicleType,
        trip: t,
      });
    }

    // From Deliveries (if delivery boy had no vehicle trip log recorded yet)
    for (const d of deliveryRecords) {
      const boyId = d.deliveredById;
      if (boyId && !driverMap.has(boyId)) {
        const assignedVehicle = agencyVehicles.find((v) => v.assignedToId === boyId);
        driverMap.set(boyId, {
          deliveryBoyId: boyId,
          deliveryBoyName: d.deliveredBy?.name || "Delivery Boy",
          deliveryBoyPhone: d.deliveredBy?.phone || null,
          vehicleId: assignedVehicle?.id || null,
          vehicleNo: assignedVehicle?.vehicleNo || "Assigned Vehicle",
          vehicleName: assignedVehicle?.vehicleName || "Delivery Vehicle",
          vehicleType: assignedVehicle?.vehicleType || "Vehicle",
          trip: null,
        });
      }
    }

    // If still empty, add any active assigned delivery vehicle
    if (driverMap.size === 0) {
      for (const v of agencyVehicles) {
        if (v.assignedToId && v.assignedTo) {
          driverMap.set(v.assignedToId, {
            deliveryBoyId: v.assignedToId,
            deliveryBoyName: v.assignedTo.name,
            deliveryBoyPhone: v.assignedTo.phone,
            vehicleId: v.id,
            vehicleNo: v.vehicleNo,
            vehicleName: v.vehicleName,
            vehicleType: v.vehicleType,
            trip: null,
          });
        }
      }
    }

    const deliveryBoyReconciliations: DeliveryBoyReconciliation[] = [];

    for (const [boyId, driverInfo] of Array.from(driverMap.entries())) {
      const t = driverInfo.trip;
      let tripItems: any[] = [];
      if (t?.items) {
        try {
          tripItems = typeof t.items === "string" ? JSON.parse(t.items) : (t.items as any[]);
        } catch {
          tripItems = [];
        }
      }

      const boyDeliveries = deliveriesByDriver.get(boyId) || [];
      const customerDeliveries: CustomerPendingItem[] = boyDeliveries.map((d) => {
        const pending = d.pendingQty > 0 ? d.pendingQty : Math.max(0, (d.deliveredQty || 0) - (d.returnedQty || 0));
        return {
          id: d.id,
          customerId: d.customerId,
          customerName: d.customer?.name || "Customer",
          customerCode: d.customer?.customerCode || null,
          phone: d.customer?.phone || "-",
          address: d.customer?.address || null,
          productId: d.productId,
          productName: d.product?.name || d.productName || "Cylinder",
          deliveredQty: d.deliveredQty || 0,
          returnedQty: d.returnedQty || 0,
          pendingEmptyQty: pending,
          paymentMode: d.paymentMode || "CASH",
          cashCollected: d.cashCollected || 0,
          creditAmount: d.creditAmount || 0,
          status: d.status || "DELIVERED",
          notes: d.notes || null,
          time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-",
        };
      });

      const pendingCustomers = customerDeliveries.filter((c) => c.pendingEmptyQty > 0);

      // Map loaded, unsold and empty return from trip
      const prodLoadedMap = new Map<string, number>();
      const prodUnsoldMap = new Map<string, number>();
      const prodEmptyTripMap = new Map<string, number>();

      if (Array.isArray(tripItems) && tripItems.length > 0) {
        for (const it of tripItems) {
          prodLoadedMap.set(it.productId, Number(it.loaded) || 0);
          prodUnsoldMap.set(it.productId, Number(it.unsoldReturned) || 0);
          prodEmptyTripMap.set(it.productId, Number(it.emptyReturned) || 0);
        }
      } else if (t && t.cylindersLoaded > 0) {
        const defaultProdId = products[0]?.id || "default";
        prodLoadedMap.set(defaultProdId, t.cylindersLoaded);
        prodUnsoldMap.set(defaultProdId, t.cylindersReturned || 0);
        prodEmptyTripMap.set(defaultProdId, t.cylindersDelivered || 0);
      }

      // Delivered and Empties from Customer Delivery records
      const prodDeliveredRecordsMap = new Map<string, number>();
      const prodEmptiesRecordsMap = new Map<string, number>();
      const prodCustomerPendingMap = new Map<string, number>();

      for (const c of customerDeliveries) {
        prodDeliveredRecordsMap.set(c.productId, (prodDeliveredRecordsMap.get(c.productId) || 0) + c.deliveredQty);
        prodEmptiesRecordsMap.set(c.productId, (prodEmptiesRecordsMap.get(c.productId) || 0) + c.returnedQty);
        prodCustomerPendingMap.set(c.productId, (prodCustomerPendingMap.get(c.productId) || 0) + c.pendingEmptyQty);
      }

      // Collect all cylinder products plus touched products
      const touchedProductIds = new Set<string>();
      for (const p of products) {
        if (p.isCylinder) touchedProductIds.add(p.id);
      }
      for (const pId of Array.from(prodLoadedMap.keys())) touchedProductIds.add(pId);
      for (const pId of Array.from(prodDeliveredRecordsMap.keys())) touchedProductIds.add(pId);

      const boyProducts: DeliveryBoyProductBreakdown[] = [];

      for (const pId of Array.from(touchedProductIds)) {
        const prodInfo = products.find((p) => p.id === pId);
        const pName = prodInfo?.name || "Cylinder";
        const loaded = prodLoadedMap.get(pId) || 0;
        const fullRet = prodUnsoldMap.get(pId) || 0;

        const delivRec = prodDeliveredRecordsMap.get(pId) || 0;
        const emptyTrip = prodEmptyTripMap.get(pId) || 0;
        const delivered = delivRec > 0 ? delivRec : (emptyTrip > 0 ? emptyTrip : Math.max(0, loaded - fullRet));

        const emptyRet = emptyTrip > 0 ? emptyTrip : (prodEmptiesRecordsMap.get(pId) || 0);
        const custPending = prodCustomerPendingMap.get(pId) || 0;

        // Total Accounted: Full Return (unsold) + Empty Return + Customer Pending
        const totalAccounted = fullRet + emptyRet + custPending;
        const short = loaded - totalAccounted;

        let prodStatus: "BALANCED" | "SHORT" | "SURPLUS" = "BALANCED";
        if (short > 0) prodStatus = "SHORT";
        else if (short < 0) prodStatus = "SURPLUS";

        if (loaded > 0 || delivered > 0 || fullRet > 0 || emptyRet > 0 || custPending > 0) {
          boyProducts.push({
            productId: pId,
            productName: pName,
            loadedQty: loaded,
            deliveredQty: delivered,
            fullReturnQty: fullRet,
            emptyReturnQty: emptyRet,
            customerPendingQty: custPending,
            totalAccountedQty: totalAccounted,
            shortQty: short,
            status: prodStatus,
          });
        }
      }

      const totalLoaded = boyProducts.reduce((s, p) => s + p.loadedQty, 0);
      const totalDelivered = boyProducts.reduce((s, p) => s + p.deliveredQty, 0);
      const totalFullReturned = boyProducts.reduce((s, p) => s + p.fullReturnQty, 0);
      const totalEmptyReturned = boyProducts.reduce((s, p) => s + p.emptyReturnQty, 0);
      const totalCustomerPending = boyProducts.reduce((s, p) => s + p.customerPendingQty, 0);
      const totalAccounted = totalFullReturned + totalEmptyReturned + totalCustomerPending;
      const totalShort = totalLoaded - totalAccounted;

      let boyStatus: "BALANCED" | "SHORT" | "SURPLUS" = "BALANCED";
      if (totalShort > 0) boyStatus = "SHORT";
      else if (totalShort < 0) boyStatus = "SURPLUS";

      const totalCashCollected = customerDeliveries.reduce((s, c) => s + c.cashCollected, 0);
      const totalCreditAmount = customerDeliveries.reduce((s, c) => s + c.creditAmount, 0);

      deliveryBoyReconciliations.push({
        deliveryBoyId: boyId,
        deliveryBoyName: driverInfo.deliveryBoyName,
        deliveryBoyPhone: driverInfo.deliveryBoyPhone,
        vehicleId: driverInfo.vehicleId,
        vehicleNo: driverInfo.vehicleNo,
        vehicleName: driverInfo.vehicleName,
        vehicleType: driverInfo.vehicleType,
        tripId: t?.id || null,
        tripStatus: t?.tripStatus || (customerDeliveries.length > 0 ? "DELIVERED" : "NO_TRIP"),
        departureTime: t?.departureTime ? new Date(t.departureTime).toISOString() : null,
        returnTime: t?.returnTime ? new Date(t.returnTime).toISOString() : null,
        totalLoaded,
        totalDelivered,
        totalFullReturned,
        totalEmptyReturned,
        totalCustomerPending,
        totalAccounted,
        totalShort,
        status: boyStatus,
        totalCashCollected,
        totalCreditAmount,
        products: boyProducts,
        customerDeliveries,
        pendingCustomers,
      });
    }

    // 9. Master Product Rows (Tab 1 exact 5 columns)
    const relevantProducts = products.filter(
      (p) => p.isCylinder || (productAggregation[p.id] && productAggregation[p.id].allocated > 0)
    );

    const productRows: DailySheetProductRow[] = relevantProducts.map((p) => {
      const agg = productAggregation[p.id] || { allocated: 0, delivered: 0, emptyReturned: 0, fullReturned: 0 };
      const totalAccounted = agg.emptyReturned + agg.fullReturned;
      const short = agg.allocated - totalAccounted;

      let status: DailySheetProductRow["status"] = "BALANCED";
      if (short > 0) status = "SHORT";
      else if (short < 0) status = "SURPLUS";

      return {
        productId: p.id,
        productName: p.name,
        isCylinder: p.isCylinder,
        allocatedQty: agg.allocated,
        deliveredQty: agg.delivered,
        emptyReturnQty: agg.emptyReturned,
        fullReturnQty: agg.fullReturned,
        totalAccountedQty: totalAccounted,
        shortQty: short,
        status,
      };
    });

    // 10. Overall Summary Stats
    const totalAllocated = productRows.reduce((s, r) => s + r.allocatedQty, 0);
    const totalDelivered = productRows.reduce((s, r) => s + r.deliveredQty, 0);
    const totalEmptyReturned = productRows.reduce((s, r) => s + r.emptyReturnQty, 0);
    const totalFullReturned = productRows.reduce((s, r) => s + r.fullReturnQty, 0);
    const totalAccounted = totalEmptyReturned + totalFullReturned;
    const totalShort = totalAllocated - totalAccounted;

    const activeTrips = tripLogs.filter((t) => t.tripStatus === "LOADED" || t.tripStatus === "OUT_FOR_DELIVERY").length;
    const completedTrips = tripLogs.filter((t) => t.tripStatus === "RETURNED" || t.tripStatus === "PARTIAL_RETURN").length;

    const totalCustomerPending = deliveryBoyReconciliations.reduce((s, d) => s + d.totalCustomerPending, 0);
    const totalBoyShortage = deliveryBoyReconciliations.reduce((s, d) => s + Math.max(0, d.totalShort), 0);

    let sheetStatus: DailySheetData["status"] = "OPEN";
    let savedNotes: string | null = null;
    let savedAt: string | null = null;

    if (register) {
      if (register.status === "CLOSED" || register.status === "VERIFIED") {
        sheetStatus = "SAVED";
      }
      savedNotes = register.notes || null;
      savedAt = register.updatedAt.toISOString();
    }

    return {
      date: dateStr,
      status: sheetStatus,
      savedAt,
      savedBy: null,
      notes: savedNotes,
      summary: {
        totalAllocated,
        totalDelivered,
        totalEmptyReturned,
        totalFullReturned,
        totalAccounted,
        totalShort,
        activeTrips,
        completedTrips,
        totalCustomerPending,
        totalBoyShortage,
      },
      productRows,
      driverTrips,
      deliveryBoyReconciliations,
      allPendingCustomers,
    };
  } catch (error) {
    console.error("[getDailySheetData]", error);
    return { error: "Failed to load daily sheet data" };
  }
}

export async function saveDailySheet(payload: {
  date: string;
  notes?: string;
  lock?: boolean;
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session || !["ADMIN", "MANAGER", "GODOWN_KEEPER"].includes(session.role) || !session.agencyId) {
      return { error: "Unauthorized" };
    }

    const agencyId = session.agencyId;
    const targetDate = new Date(payload.date);
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

    const existing = await prisma.dailyStockRegister.findFirst({
      where: { agencyId, date: dayStart },
    });

    const newStatus = payload.lock ? "VERIFIED" : "CLOSED";

    if (existing) {
      await prisma.dailyStockRegister.update({
        where: { id: existing.id },
        data: {
          status: newStatus,
          notes: payload.notes || existing.notes,
        },
      });
    } else {
      await prisma.dailyStockRegister.create({
        data: {
          agencyId,
          date: dayStart,
          status: newStatus,
          notes: payload.notes || "Saved via Daily Sheet Calculator",
          submittedById: session.userId,
        },
      });
    }

    revalidatePath("/admin/daily-sheet");
    revalidatePath("/manager/daily-sheet");
    revalidatePath("/godown-keeper/daily-sheet");
    revalidatePath("/admin/stock");

    return { success: true };
  } catch (error) {
    console.error("[saveDailySheet]", error);
    return { error: "Failed to save daily sheet record" };
  }
}
