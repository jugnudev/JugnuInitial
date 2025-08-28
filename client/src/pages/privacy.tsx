import { Link } from "wouter";

export default function Privacy() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-muted hover:text-accent transition-colors duration-200 mb-6 focus-ring"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Home
          </Link>
          
          <h1 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-lg prose-invert max-w-none">
          <p className="text-text leading-relaxed">
            This Privacy Policy describes how Jugnu ("we," "us," or "our") collects, uses, and shares your personal information when you use our website, mobile application, or services (collectively, the "Service").
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            1. Information We Collect
          </h2>
          
          <h3 className="font-fraunces text-xl font-semibold tracking-tight text-primary mt-6 mb-3">
            Information You Provide
          </h3>
          <p className="text-text leading-relaxed">
            We collect information you provide directly to us, including:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>Account information (name, email address, phone number)</li>
            <li>Profile information and preferences</li>
            <li>Payment information (processed by third-party processors)</li>
            <li>Communications with us (emails, messages, feedback)</li>
            <li>Event-related information and RSVP responses</li>
            <li>Marketing preferences and communication settings</li>
          </ul>

          <h3 className="font-fraunces text-xl font-semibold tracking-tight text-primary mt-6 mb-3">
            Automatically Collected Information
          </h3>
          <p className="text-text leading-relaxed">
            We automatically collect certain information about your device and use of our Service:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>Device information (IP address, browser type, operating system)</li>
            <li>Usage data (pages visited, time spent, click patterns)</li>
            <li>Location information (general geographic location)</li>
            <li>Cookies and similar tracking technologies</li>
            <li>Referral source and search terms</li>
          </ul>

          <h3 className="font-fraunces text-xl font-semibold tracking-tight text-primary mt-6 mb-3">
            Information from Third Parties
          </h3>
          <p className="text-text leading-relaxed">
            We may receive information about you from third parties, including social media platforms, event partners, payment processors, and analytics providers.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            2. How We Use Your Information
          </h2>
          <p className="text-text leading-relaxed">
            We use your information to:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send confirmations</li>
            <li>Send you event information, updates, and promotional materials</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Personalize and customize your experience</li>
            <li>Analyze usage patterns and optimize our platform</li>
            <li>Prevent fraud and enhance security</li>
            <li>Comply with legal obligations and enforce our terms</li>
            <li>Conduct research and development</li>
          </ul>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            3. Information Sharing and Disclosure
          </h2>
          <p className="text-text leading-relaxed">
            We may share your information in the following circumstances:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li><strong>Service Providers:</strong> With third-party vendors who provide services on our behalf</li>
            <li><strong>Event Partners:</strong> With event organizers and venues for event-related purposes</li>
            <li><strong>Payment Processors:</strong> With payment service providers to process transactions</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
            <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            <li><strong>Consent:</strong> When you have given us permission to do so</li>
          </ul>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            4. Cookies and Tracking Technologies
          </h2>
          <p className="text-text leading-relaxed">
            We use cookies, web beacons, and similar technologies to collect information about your browsing activities. You can control cookie settings through your browser, but disabling cookies may affect functionality.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            5. Data Security
          </h2>
          <p className="text-text leading-relaxed">
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            6. Data Retention
          </h2>
          <p className="text-text leading-relaxed">
            We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            7. Your Rights and Choices
          </h2>
          <p className="text-text leading-relaxed">
            Depending on your location, you may have certain rights regarding your personal information:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>Access and update your account information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt-out of marketing communications</li>
            <li>Request a copy of your personal information</li>
            <li>Object to or restrict certain processing activities</li>
          </ul>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            8. International Transfers
          </h2>
          <p className="text-text leading-relaxed">
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            9. Children's Privacy
          </h2>
          <p className="text-text leading-relaxed">
            Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it immediately.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            10. Third-Party Links
          </h2>
          <p className="text-text leading-relaxed">
            Our Service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            11. Changes to This Privacy Policy
          </h2>
          <p className="text-text leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            12. Contact Information
          </h2>
          <p className="text-text leading-relaxed">
            If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
          </p>
          <p className="text-text leading-relaxed">
            Email: <a href="mailto:relations@thehouseofjugnu.com" className="text-accent hover:underline focus-ring">relations@thehouseofjugnu.com</a><br/>
            Address: Vancouver, British Columbia, Canada
          </p>
        </div>
      </div>
    </div>
  );
}
