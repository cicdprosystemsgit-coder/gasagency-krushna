import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { verifyCashfreePayment } from "@/app/actions/cashfree";
import { PLANS } from "@/lib/plans";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ order_id?: string }>;
}

export default async function BillingCallbackPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !session.agencyId || session.role !== "ADMIN") {
    redirect("/login");
  }

  const { order_id: orderId } = await searchParams;

  if (!orderId) {
    redirect("/admin/billing");
  }

  const result = await verifyCashfreePayment(orderId);

  const isPaid    = "status" in result && result.status === "PAID";
  const isFailed  = "status" in result && (result.status === "FAILED" || result.status === "CANCELLED");
  const isPending = !isPaid && !isFailed;
  const isError   = "error" in result;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-5">

        {/* Icon */}
        <div className="flex justify-center">
          {isPaid && <CheckCircle className="w-16 h-16 text-green-500" />}
          {isFailed && <XCircle className="w-16 h-16 text-red-400" />}
          {(isPending || isError) && <Clock className="w-16 h-16 text-amber-400" />}
        </div>

        {/* Heading */}
        <div>
          {isPaid && (
            <>
              <h1 className="text-2xl font-extrabold text-zinc-900">Payment Successful!</h1>
              <p className="text-zinc-500 mt-2 text-sm">
                Your subscription has been activated.{" "}
                {result.alreadyActivated && "(Detected from webhook — already active.)"}
              </p>
            </>
          )}
          {isFailed && (
            <>
              <h1 className="text-2xl font-extrabold text-zinc-900">Payment Failed</h1>
              <p className="text-zinc-500 mt-2 text-sm">
                The payment was not completed. No charges have been made.
              </p>
            </>
          )}
          {isPending && !isError && (
            <>
              <h1 className="text-2xl font-extrabold text-zinc-900">Payment Pending</h1>
              <p className="text-zinc-500 mt-2 text-sm">
                Your payment is being processed. Your plan will activate automatically once confirmed.
              </p>
            </>
          )}
          {isError && (
            <>
              <h1 className="text-2xl font-extrabold text-zinc-900">Verification Error</h1>
              <p className="text-zinc-500 mt-2 text-sm">
                {"error" in result ? result.error : "Could not verify payment status."}
              </p>
            </>
          )}
        </div>

        {/* Order ref */}
        <p className="text-xs text-zinc-400 font-mono bg-zinc-50 rounded-lg py-2 px-4 inline-block">
          Order: {orderId}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/admin/billing"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Billing
          </Link>
          {isPaid && (
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Go to Dashboard
            </Link>
          )}
          {(isFailed || isError) && (
            <Link
              href="/admin/billing"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Try Again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
