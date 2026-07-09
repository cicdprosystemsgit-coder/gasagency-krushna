export interface FeatureDef {
  key: string;
  label: string;
  description: string;
  category: string;
}

export const ALL_FEATURES: FeatureDef[] = [
  // Operations
  { key: "inventory",           label: "Inventory Management",    description: "Track office stock of cylinders and products",             category: "Operations"    },
  { key: "godown",              label: "Godown Management",        description: "Manage godown stock and cylinder in/out movements",         category: "Operations"    },
  { key: "vehicle_management",  label: "Vehicle Management",       description: "Track delivery vehicles, trips, and fleet status",          category: "Operations"    },
  { key: "delivery_plan",       label: "Delivery Plan",            description: "Plan and schedule customer deliveries",                     category: "Operations"    },
  // Accounts
  { key: "customer_management", label: "Customer Management",      description: "Manage domestic and commercial customer records",           category: "Accounts"      },
  { key: "office_transactions", label: "Office Transactions",      description: "Record new connections, regulators, pipe sales",           category: "Accounts"      },
  { key: "commercial_sales",    label: "Commercial Sales",         description: "Track hotel/restaurant bulk sales and udhari",              category: "Accounts"      },
  { key: "credit_ledger",       label: "Credit Ledger",            description: "Per-customer udhari (credit) balance tracking",            category: "Accounts"      },
  { key: "gst_invoicing",       label: "GST Invoicing",            description: "Generate GST-compliant invoices for commercial customers", category: "Accounts"      },
  // Finance
  { key: "salaries",            label: "Salaries & Drawings",      description: "Process employee salaries, advances, and owner drawings",  category: "Finance"       },
  { key: "expenses",            label: "Expenses & Vehicles",      description: "Track operational expenses and vehicle/agency assets",      category: "Finance"       },
  { key: "assets_management",   label: "Assets & Finance",         description: "Track agency assets, P&L, inventory valuation, and cash flow", category: "Finance"    },
  { key: "expense_categories",  label: "Expense Categories",       description: "Organise expenses by category with monthly budgets",       category: "Finance"       },
  { key: "daily_closing",       label: "Daily Closing",            description: "End-of-day cash and cylinder count closing",               category: "Finance"       },
  // People
  { key: "staff_management",    label: "Staff Management",         description: "Create and manage employee accounts and roles",            category: "People"        },
  { key: "approvals",           label: "Approvals Workflow",       description: "Multi-level approval flow for daily summaries",            category: "People"        },
  { key: "leave_management",    label: "Leave Management",         description: "Employee leave requests and approval",                     category: "People"        },
  { key: "attendance",          label: "Attendance",               description: "Daily punch-in/out and attendance tracking",               category: "People"        },
  // Intelligence
  { key: "analytics",           label: "Analytics & Reports",      description: "Business insights, charts, and performance reports",       category: "Intelligence"  },
  { key: "payment_receipts",    label: "Payment Receipts",         description: "Formal receipts for customer cash/UPI payments",           category: "Intelligence"  },
  { key: "documents",           label: "Documents",                description: "KYC, vehicle, and agency document storage",                category: "Intelligence"  },
  { key: "complaints",          label: "Customer Complaints",      description: "Log and resolve customer complaints",                      category: "Intelligence"  },
  { key: "export",              label: "Data Export",              description: "Export reports to Excel/PDF for offline use",              category: "Intelligence"  },
  // Enterprise
  { key: "branches",            label: "Branch Management",        description: "Multi-branch setup for larger distributors",               category: "Enterprise"    },
  { key: "api_gateway",         label: "API Gateway",              description: "API keys for third-party integrations",                    category: "Enterprise"    },
  { key: "security",            label: "Security & 2FA",           description: "Two-factor authentication and security settings",          category: "Enterprise"    },
];

export const FEATURE_CATEGORIES = ["Operations", "Accounts", "Finance", "People", "Intelligence", "Enterprise"] as const;

export const ALL_FEATURE_KEYS = ALL_FEATURES.map((f) => f.key);

/** Returns true when a feature is accessible — empty array means all features enabled (backward compat) */
export function isFeatureEnabled(enabledFeatures: string[], key: string): boolean {
  if (enabledFeatures.length === 0) return true;
  return enabledFeatures.includes(key);
}
