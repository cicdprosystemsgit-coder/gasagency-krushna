# 🛡️ GasAgency Enterprise QA Testing Platform

> **Dedicated, Standalone Quality Assurance, Automation & Server Capacity Testing Platform**  
> Specifically engineered for testing the **Deployed Version** (Staging, UAT, Production) of the GasAgency web application.

---

## 🚀 How to Run the Platform Locally

This testing platform is **completely independent** from the main agency application code.

### Option 1: Start the Local QA Server (Recommended for Full Features)

From your terminal, run:

```bash
cd "d:\CICD Project\Gasagency\gasagency\qa-platform"
node server.js
```

Or using npm:
```bash
npm start
```

Open your browser and navigate to:
👉 **[http://localhost:5050](http://localhost:5050)**

*(Zero npm dependencies required — boots in less than 1 second on Node.js 18+!)*

---

### Option 2: Instant 1-Click Launch (No Terminal Needed)

You can also directly open the standalone application file in any browser (Chrome, Edge, Safari):
👉 `d:\CICD Project\Gasagency\gasagency\qa-platform\public\index.html`

---

## ⚡ Market-Standard Automation & Capacity Testing Features

Inspired by industry leaders like **k6, Postman Collection Runner, Artillery, and JMeter**:

### 1. 🚀 Stress, Concurrency & Server Limit Benchmarking (NEW!)
- **Configurable Workload**:
  - Request Count: 10 to 1,000 requests (quick presets: 25, 50, 100, 250, 500, 1000)
  - Virtual Users (Concurrency): 1 to 50 concurrent connections
  - HTTP Methods: `GET`, `HEAD`, `POST`
  - Request Pacing / Delay: `0ms` (burst stress), `25ms`, `50ms`, `100ms` (realistic human pacing)
- **Live Real-time Telemetry (SSE & Web Worker)**:
  - 📈 **Live Throughput**: Real-time Requests Per Second (RPS)
  - ⏱️ **Average & P95 Latency**: Live response speed in milliseconds
  - 🟢 **Success (2xx)** vs 🟡 **Rate Limited (429)** vs 🔴 **Server Errors (5xx)**
  - 🌊 **Live Response Stream Ribbon**: Color-coded pill visualizer as responses stream in
- **Rate-Limiting & DDoS Shield Detection**:
  - Automatically flags if your server (Nginx, Cloudflare, Next.js RateLimiter) triggers `HTTP 429 Too Many Requests`
  - Captures and displays `Retry-After` response headers
- **Percentile Performance Matrix (k6 Standard)**:
  - `Min`, `P50 (Median)`, `Avg`, `P90`, `P95 (SLA Target)`, `P99 (Tail Latency)`, `Max`
- **Server Capacity Verdict**:
  - 🏆 `HIGHLY_RESILIENT`: 100% requests passed with low latency under load
  - 🛡️ `RATE_LIMITED_PROTECTED`: Server rate limiting activated smoothly without crashing
  - ⚠️ `SERVER_BOTTLENECK`: High latency degradation or 500 server errors
- **1-Click Export**:
  - Export full test run as **CSV**
  - Copy formatted **Markdown Performance Benchmark** for Jira / Slack

---

### 2. 🌐 Live Deployed Target Configuration & Health Prober
- Input any live URL:
  - Production: `https://gasagency.app`
  - Staging / UAT: `https://staging.gasagency.app`
  - Local Dev: `http://localhost:3000`
- **Real-Time Health Probe**: Checks HTTP response status (200 OK), roundtrip latency (ms), SSL / TLS certificate, and meta viewport tags.
- **Security Headers Audit**: Verifies `HSTS`, `Content-Security-Policy`, `X-Frame-Options`, and `X-Content-Type-Options`.

---

### 3. 📱 Mobile & Responsive Device Studio (Crucial for Mobile Users)
Since the majority of gas agency delivery boys, godown staff, and managers use mobile devices:
- **Interactive Multi-Device Frame**:
  - 📱 **iPhone SE (375 × 667 px)** — *Strict mobile baseline test*
  - 📱 **iPhone 15 Pro (393 × 852 px)**
  - 📱 **Samsung Galaxy S23 (360 × 780 px)**
  - 📱 **Android Tablet / iPad Mini (768 × 1024 px)**
  - 💻 **Laptop / Desktop (1280 × 800 px)**
- **Orientation Toggle**: Instantly switch between Portrait and Landscape.
- **Quick Route Jumpers**: 1-click test navigation to `/`, `/login`, `/signup`, `/admin`, `/deliveries`, `/godown`, `/daily-sheet`, `/customer-management`, `/expenses`, `/security`.

---

### 4. ⚡ Automated Probes & Contract Tests (10 Tests)
Automated checks with animated step-by-step progress bars and latency timers:
- `AUTO-01`: Public Landing Page Availability
- `AUTO-02`: Authentication Login Gateway
- `AUTO-03`: Agency Self-Service Onboarding Page
- `AUTO-04`: Unauthenticated Admin Redirection Gate
- `AUTO-05`: Mobile Viewport Meta Tag Contract (`viewport-fit=cover`)
- `AUTO-06`: SSL / TLS Protocol Enforcement
- `AUTO-07`: Anti-Clickjacking Headers (`X-Frame-Options`)
- `AUTO-08`: Core Web Vitals Server Latency (TTFB < 800ms)
- `AUTO-09`: Godown Logistics Route Accessibility
- `AUTO-10`: Daily Sheet Cash Balancing Endpoint

---

### 5. 📋 Comprehensive Manual QA Matrix (32 Scenarios Across 7 Suites)
1. 📱 **Mobile UX & Viewport (5 Tests)**: iOS auto-zoom prevention (>= 16px font), bottom nav clearance (`pb-24`), horizontal table scroll, 44px tap targets.
2. 🔐 **Auth, 2FA & PIN Login (5 Tests)**: Email/pass, 4-digit PIN mode, invalid credentials rejection, agency signup, password strength meter.
3. 🏠 **Landing & Onboarding (4 Tests)**: Mobile hero readability, cockpit tab switching, single-open FAQ accordions, CTA anchors.
4. 🚚 **Godown & Fleet Logistics (5 Tests)**: Truck loading, cylinder count reconciliation, leaking cylinder isolation, PUC expiry alerts, delivery boy checklist.
5. 👥 **Customers & Ledgers (5 Tests)**: Commercial (19kg GST) vs Domestic (14.2kg), partial payments, credit ledger, tax invoice generation.
6. 💰 **Daily Closing & Invoicing (4 Tests)**: Cash balancing, manager-to-admin approval workflow, diesel expense logging, staff salary slips.
7. 🛡️ **RBAC & Security Boundaries (4 Tests)**: Delivery boy role restriction, multi-tenant isolation, audit logs, sign-out invalidation.

---

### 6. 🐛 Defect / Bug Tracker
- 1-click **Log Defect** on any failing test case.
- Fields: Severity (`P0 - Blocker`, `P1 - Critical`, `P2 - Major`, `P3 - Minor`), Route, Steps to Reproduce, Expected vs Actual.
- 1-click **Copy Markdown** formatted for pasting directly into GitHub Issues, Jira, or Slack.

---

### 7. 🏆 Executive Sign-Off & Audit Certification
- Computes overall pass rate and blocker count.
- Generates official QA Sign-off Certificate with Lead QA name, Release build tag, and date.
- Export as **Markdown report**, **Printable PDF document**, or **JSON session backup**.
