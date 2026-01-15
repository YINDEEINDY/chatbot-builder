export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: January 15, 2026</p>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using KonKui ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              KonKui is a Chatbot Builder platform that allows users to create and manage
              automated chatbots for Facebook Pages. Our services include:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Chatbot creation and configuration</li>
              <li>Facebook Page integration</li>
              <li>Automated message responses</li>
              <li>Analytics and engagement tracking</li>
              <li>Live chat management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">
              To use our Service, you must:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Create an account with accurate information</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Keep your login credentials secure</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Facebook Integration</h2>
            <p className="text-gray-600 mb-4">
              When connecting your Facebook Page to our Service:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>You must have admin access to the Facebook Page</li>
              <li>You authorize us to access and manage messages on your behalf</li>
              <li>You must comply with Facebook's Platform Terms and Policies</li>
              <li>You are responsible for the content sent through your chatbot</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">
              You agree NOT to use our Service to:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Send spam or unsolicited messages</li>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Distribute malware or harmful content</li>
              <li>Harass, abuse, or harm others</li>
              <li>Collect personal data without consent</li>
              <li>Impersonate others or provide false information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Content Ownership</h2>
            <p className="text-gray-600 mb-4">
              You retain ownership of the content you create using our Service. By using our
              Service, you grant us a limited license to store, process, and display your
              content as necessary to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Service Availability</h2>
            <p className="text-gray-600 mb-4">
              We strive to maintain high availability but do not guarantee uninterrupted service.
              We may modify, suspend, or discontinue any part of the Service at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law, KonKui shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use
              of the Service. Our total liability shall not exceed the amount paid by you
              for the Service in the past 12 months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Indemnification</h2>
            <p className="text-gray-600 mb-4">
              You agree to indemnify and hold harmless KonKui and its affiliates from any
              claims, damages, or expenses arising from your use of the Service or violation
              of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Termination</h2>
            <p className="text-gray-600 mb-4">
              We may terminate or suspend your account at any time for violation of these Terms.
              You may also terminate your account at any time by contacting us. Upon termination,
              your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of
              significant changes. Continued use of the Service after changes constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">12. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of
              Thailand, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <ul className="list-none text-gray-600 space-y-1 ml-4">
              <li>Email: support@konkui.com</li>
              <li>Website: https://konkui.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <a href="/login" className="text-blue-600 hover:text-blue-800">
            &larr; Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}