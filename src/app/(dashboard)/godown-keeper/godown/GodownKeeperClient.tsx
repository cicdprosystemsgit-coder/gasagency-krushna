"use client";

import { GodownTabsContainer } from "../../admin/godown/GodownTabsContainer";

interface GodownKeeperClientProps {
  initialRecords: any[];
  initialDeletedRecords?: any[];
  totalFilled: number;
  totalEmpty: number;
  userId: string;
  cylinderTypes: any[];
  initialVehicles: any[];
  initialTripLogs: any[];
  initialDeletedTripLogs?: any[];
  deliveryBoys: any[];
  selectedDate?: string;
  deliveryRequests?: any[];
  products?: any[];
  todayMovements?: any[];
  stockMap?: Record<string, { officeStock: number; godownStock: number }>;
}

const EMPTY_LIST: any[] = [];

export function GodownKeeperClient({
  initialRecords,
  initialDeletedRecords = EMPTY_LIST,
  totalFilled,
  totalEmpty,
  userId,
  cylinderTypes,
  initialVehicles,
  initialTripLogs,
  initialDeletedTripLogs = EMPTY_LIST,
  deliveryBoys,
  selectedDate,
  deliveryRequests = EMPTY_LIST,
  products = EMPTY_LIST,
  todayMovements = EMPTY_LIST,
  stockMap = {},
}: GodownKeeperClientProps) {
  const activeDate = selectedDate || new Date().toISOString().slice(0, 10);

  return (
    <GodownTabsContainer
      initialRecords={initialRecords}
      initialDeletedRecords={initialDeletedRecords}
      totalFilled={totalFilled}
      totalEmpty={totalEmpty}
      deliveryVehicles={initialVehicles}
      deliveryBoys={deliveryBoys}
      todayTripLogs={initialTripLogs}
      initialDeletedTripLogs={initialDeletedTripLogs}
      cylinderTypes={cylinderTypes}
      isAdmin={false}
      userId={userId}
      userRole="GODOWN_KEEPER"
      mapRecords={initialRecords}
      mapTrips={initialTripLogs}
      mapMovements={todayMovements}
      selectedDate={activeDate}
      deliveryRequests={deliveryRequests}
      products={products.length > 0 ? products : cylinderTypes}
      stockMap={stockMap}
    />
  );
}
