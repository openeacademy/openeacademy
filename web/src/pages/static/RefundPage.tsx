export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose prose-blue">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Refund & Cancellation Policy</h1>
      
      <div className="text-gray-600 space-y-6">
        <p>Last updated: August 2026</p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Digital Products and Subscriptions</h2>
        <p>
          At Open E Academy, we offer digital study materials, mock tests, and subscription plans. Given the nature of digital content that can be downloaded or accessed immediately upon purchase, we generally do not offer refunds once the purchase is completed.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Subscription Cancellations</h2>
        <p>
          You can cancel your subscription renewal at any time. Your access to the premium content will remain active until the end of your current billing cycle. After that, your account will revert to the free tier, and you will not be charged again. We do not provide prorated refunds for mid-cycle cancellations.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Exceptional Circumstances</h2>
        <p>We may, at our sole discretion, issue a refund under the following exceptional circumstances:</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li><strong>Duplicate Payment:</strong> If you were accidentally charged twice for the same transaction due to a technical error.</li>
          <li><strong>Non-delivery of Service:</strong> If you made a payment but the premium features were not unlocked on your account within 24 hours, and our support team cannot resolve the issue.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. How to Request a Refund</h2>
        <p>
          If you believe your case falls under the exceptional circumstances, please contact our support team at <strong>support@openeacademy.in</strong> within 3 days of the transaction. Include your registered email/mobile number, transaction ID, and the reason for your request.
        </p>
        <p>
          Refund requests are reviewed within 5-7 business days. If approved, the refund will be processed back to the original payment method. Depending on your bank, it may take an additional 3-10 days for the credited amount to reflect in your account.
        </p>

        <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Contact Us</h2>
        <p>If you have any questions or concerns regarding this policy, please reach out to us at <strong>support@openeacademy.in</strong>.</p>
      </div>
    </div>
  );
}
