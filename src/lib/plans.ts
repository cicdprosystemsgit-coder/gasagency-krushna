// Static subscription plan definitions shared between client and server components

export const PLANS = {
  basic: {
    name: "Basic",
    price: { monthly: 999, yearly: 9990 },
    maxUsers: 5,
    features: [
      "Up to 5 users",
      "Inventory & stock management",
      "Delivery tracking",
      "Customer management",
      "GST invoicing",
      "Basic reports",
    ],
    color: "#6B7280",
  },
  professional: {
    name: "Professional",
    price: { monthly: 2499, yearly: 24990 },
    maxUsers: 20,
    features: [
      "Up to 20 users",
      "Everything in Basic",
      "WhatsApp integration",
      "Advanced analytics",
      "Attendance tracking",
      "Document management",
      "Customer self-service portal",
      "Payment receipts",
    ],
    color: "#2563EB",
  },
  enterprise: {
    name: "Enterprise",
    price: { monthly: 4999, yearly: 49990 },
    maxUsers: -1, // unlimited
    features: [
      "Unlimited users",
      "Everything in Professional",
      "Multi-branch support",
      "API access & webhooks",
      "2FA authentication",
      "Priority support",
      "Custom integrations",
      "Data export / import",
    ],
    color: "#7C3AED",
  },
} as const;
