export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 13, 2026</p>

        <div className="prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to KonKui ("we," "our," or "us"). We are committed to protecting your privacy
              and ensuring the security of your personal information. This Privacy Policy explains
              how we collect, use, disclose, and safeguard your information when you use our
              Chatbot Builder platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect the following types of information:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>Account Information:</strong> Name, email address, and profile information when you register</li>
              <li><strong>Facebook Data:</strong> When you connect your Facebook Page, we access your Page name, ID, and messaging data</li>
              <li><strong>Instagram Data:</strong> When you connect your Instagram Business Account, we access your Instagram username, account ID, and direct messaging data</li>
              <li><strong>Usage Data:</strong> Information about how you use our platform, including chatbot configurations and analytics</li>
              <li><strong>Communication Data:</strong> Messages sent and received through your connected Facebook Pages and Instagram Business Accounts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the collected information to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Provide and maintain our chatbot building services</li>
              <li>Process and respond to messages on your Facebook Pages and Instagram Business Accounts</li>
              <li>Display analytics and engagement metrics for your Pages</li>
              <li>Improve and personalize your experience</li>
              <li>Send important updates about our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Facebook & Instagram Data Usage</h2>
            <p className="text-gray-600 mb-4">
              When you connect your Facebook Page and Instagram Business Account to our platform, we request the following permissions:
            </p>
            <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">Facebook Page Permissions</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>pages_show_list:</strong> To display your managed Facebook Pages so you can select which Page to connect to the chatbot</li>
              <li><strong>pages_read_engagement:</strong> To read and display posts, comments, and engagement data from your Facebook Page so you can monitor and manage your Page content</li>
              <li><strong>pages_manage_metadata:</strong> To display Page information and subscribe your Page to webhook events for receiving real-time messages</li>
              <li><strong>pages_messaging:</strong> To send and receive messages through your chatbot on Facebook Messenger, enabling automated responses and live chat support</li>
              <li><strong>pages_read_user_content:</strong> To read user-generated content such as comments and reviews on your Page, allowing you to view and manage interactions</li>
            </ul>
            <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">Instagram Permissions</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li><strong>instagram_basic:</strong> To access your Instagram Business Account profile information, including username and account ID</li>
              <li><strong>instagram_manage_messages:</strong> To send and receive direct messages on your Instagram Business Account through your chatbot, enabling automated responses and live chat support for your Instagram audience</li>
            </ul>
            <p className="text-gray-600 mt-4">
              We only access and store the data necessary to provide our services. We do not sell
              your Facebook or Instagram data to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Data Storage and Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate security measures to protect your personal information.
              Your data is stored securely and we use encryption for data transmission.
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your personal information for as long as your account is active or as
              needed to provide you services. You can request deletion of your data at any time
              by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Disconnect your Facebook Pages at any time</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Data Deletion</h2>
            <p className="text-gray-600 mb-4">
              To delete your data, you can:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Disconnect your Facebook Page from the Configure page</li>
              <li>Delete your account from the Profile settings</li>
              <li>Contact us at support@konkui.com to request complete data deletion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">
              Our platform integrates with Facebook/Meta services, including Facebook Messenger
              and Instagram Messaging APIs. Please review Meta's Privacy Policy for information
              about how they handle your data. We are not responsible for the privacy practices
              of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
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