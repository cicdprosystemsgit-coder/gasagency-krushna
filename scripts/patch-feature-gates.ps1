$featureMap = @{
  'admin\accounts\dashboard\page.tsx'      = 'finance_dashboard'
  'admin\accounts\agency-account\page.tsx' = 'agency_account'
  'admin\accounts\transfer\page.tsx'       = 'fund_transfer'
  'admin\accounts\tax-summary\page.tsx'    = 'tax_itr_summary'
  'admin\accounts\page.tsx'               = 'personal_accounts'
  'admin\analytics\page.tsx'              = 'analytics'
  'admin\api-keys\page.tsx'               = 'api_gateway'
  'admin\approvals\page.tsx'              = 'approvals'
  'admin\assets\page.tsx'                 = 'assets_management'
  'admin\attendance\page.tsx'             = 'attendance'
  'admin\branches\page.tsx'               = 'branches'
  'admin\commercial-sales\page.tsx'       = 'commercial_sales'
  'admin\company-payments\page.tsx'       = 'company_payments'
  'admin\complaints\page.tsx'             = 'complaints'
  'admin\credit-ledger\page.tsx'          = 'credit_ledger'
  'admin\customer-management\page.tsx'    = 'customer_management'
  'admin\daily-closing\page.tsx'          = 'daily_closing'
  'admin\delivery-plan\page.tsx'          = 'delivery_plan'
  'admin\documents\page.tsx'              = 'documents'
  'admin\expense-categories\page.tsx'     = 'expense_categories'
  'admin\expenses\page.tsx'               = 'expenses'
  'admin\export\page.tsx'                 = 'export'
  'admin\godown\page.tsx'                 = 'godown'
  'admin\gst-invoicing\page.tsx'          = 'gst_invoicing'
  'admin\inventory\page.tsx'              = 'inventory'
  'admin\leave-management\page.tsx'       = 'leave_management'
  'admin\office-transactions\page.tsx'    = 'office_transactions'
  'admin\payment-receipts\page.tsx'       = 'payment_receipts'
  'admin\regulators\page.tsx'             = 'regulator_ledger'
  'admin\salaries\page.tsx'               = 'salaries'
  'admin\security\page.tsx'               = 'security'
  'admin\staff-management\page.tsx'       = 'staff_management'
  'admin\vehicle-management\page.tsx'     = 'vehicle_management'
  'manager\approvals\page.tsx'            = 'approvals'
  'manager\assets\page.tsx'               = 'assets_management'
  'manager\commercial-sales\page.tsx'     = 'commercial_sales'
  'manager\credit-ledger\page.tsx'        = 'credit_ledger'
  'manager\customer-management\page.tsx'  = 'customer_management'
  'manager\daily-closing\page.tsx'        = 'daily_closing'
  'manager\delivery-plan\page.tsx'        = 'delivery_plan'
  'manager\expenses\page.tsx'             = 'expenses'
  'manager\godown\page.tsx'               = 'godown'
  'manager\gst-invoicing\page.tsx'        = 'gst_invoicing'
  'manager\inventory\page.tsx'            = 'inventory'
  'manager\leave-management\page.tsx'     = 'leave_management'
  'manager\office-transactions\page.tsx'  = 'office_transactions'
  'manager\regulators\page.tsx'           = 'regulator_ledger'
  'manager\salaries\page.tsx'             = 'salaries'
  'manager\vehicle-management\page.tsx'   = 'vehicle_management'
  'staff\commercial-sales\page.tsx'       = 'commercial_sales'
  'staff\credit-ledger\page.tsx'          = 'credit_ledger'
  'staff\customer-management\page.tsx'    = 'customer_management'
  'staff\gst-invoicing\page.tsx'          = 'gst_invoicing'
  'staff\inventory\page.tsx'              = 'inventory'
  'staff\leave-management\page.tsx'       = 'leave_management'
  'staff\office-transactions\page.tsx'    = 'office_transactions'
  'staff\regulators\page.tsx'             = 'regulator_ledger'
  'staff\payment-receipts\page.tsx'       = 'payment_receipts'
  'delivery-boy\credit-ledger\page.tsx'   = 'credit_ledger'
  'delivery-boy\leave-management\page.tsx'= 'leave_management'
  'godown-keeper\godown\page.tsx'         = 'godown'
  'godown-keeper\inventory\page.tsx'      = 'inventory'
  'godown-keeper\leave-management\page.tsx'= 'leave_management'
}

$base = "src\app\(dashboard)"
$patched = 0
$skipped = 0

foreach ($rel in $featureMap.Keys) {
  $featureKey = $featureMap[$rel]
  $pagePath = Join-Path $base $rel

  if (-not (Test-Path $pagePath)) {
    Write-Host "SKIP (not found): $pagePath"
    $skipped++
    continue
  }

  $lines = Get-Content $pagePath -Encoding UTF8
  $joined = $lines -join "`n"

  # Already patched
  if ($joined -match 'getSessionWithFeatures|requireFeature') {
    Write-Host "ALREADY DONE: $pagePath"
    $skipped++
    continue
  }

  # 1. Replace import
  $joined = $joined -replace 'import \{ getSession \} from "@/lib/auth";', "import { getSessionWithFeatures, requireFeature } from `"@/lib/feature-gate`";"

  # 2. Replace getSession() → getSessionWithFeatures()
  $joined = $joined -replace 'await getSession\(\)', 'await getSessionWithFeatures()'

  # 3. After the redirect(... line, inject requireFeature
  # Find the line with the auth guard redirect and add requireFeature after it
  $joined = $joined -replace '(if \(!session[^\n]*redirect\([^)]+\);)', "`$1`n  requireFeature(session, `"$featureKey`");"

  Set-Content $pagePath -Value $joined -Encoding UTF8 -NoNewline
  Write-Host "PATCHED [$featureKey]: $pagePath"
  $patched++
}

Write-Host ""
Write-Host "=== Done. Patched: $patched  |  Skipped: $skipped ==="
