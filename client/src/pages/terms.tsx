import { Link } from "wouter";

export default function Terms() {
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
            Terms of Service
          </h1>
          <p className="text-muted">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-lg prose-invert max-w-none">
          <p className="text-text leading-relaxed">
            These Terms of Service ("Terms") govern your use of the Jugnu website, mobile application, and services (collectively, the "Service") operated by Jugnu ("we," "us," or "our"). By accessing or using our Service, you agree to be bound by these Terms.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-text leading-relaxed">
            By accessing or using our Service, you affirm that you are at least 18 years old and have the legal capacity to enter into these Terms. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            2. Description of Service
          </h2>
          <p className="text-text leading-relaxed">
            Jugnu is a cultural events platform that provides information about concerts, festivals, cultural performances, and community gatherings. We may also offer event ticketing, promotional services, and related features. Our Service is subject to change without notice.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            3. User Accounts
          </h2>
          <p className="text-text leading-relaxed">
            You may need to create an account to access certain features. You are responsible for:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Providing accurate and current information</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            4. Prohibited Uses
          </h2>
          <p className="text-text leading-relaxed">
            You agree not to use the Service to:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Harass, abuse, or harm others</li>
            <li>Transmit viruses, malware, or harmful code</li>
            <li>Spam or send unsolicited communications</li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Collect user information without consent</li>
            <li>Engage in fraud or deceptive practices</li>
          </ul>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            5. Intellectual Property Rights
          </h2>
          <p className="text-text leading-relaxed">
            The Service and its content, including but not limited to text, graphics, logos, images, software, and design, are owned by Jugnu or our licensors and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without our written consent.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            6. User-Generated Content
          </h2>
          <p className="text-text leading-relaxed">
            You retain ownership of content you submit but grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content in connection with the Service. You represent that you have all necessary rights to grant this license and that your content does not violate any third-party rights.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            7. Events and Ticketing
          </h2>
          <p className="text-text leading-relaxed">
            When purchasing tickets through our Service:
          </p>
          <ul className="text-text leading-relaxed ml-6 list-disc">
            <li>All sales are final unless otherwise specified</li>
            <li>Tickets are subject to availability and event-specific terms</li>
            <li>You are responsible for checking event details and any changes</li>
            <li>We are not responsible for cancelled or rescheduled events</li>
            <li>Refunds, if available, are subject to the event organizer's policy</li>
            <li>Resale of tickets may be prohibited and could result in ticket cancellation</li>
          </ul>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            8. Payments and Fees
          </h2>
          <p className="text-text leading-relaxed">
            All prices are listed in Canadian dollars unless otherwise specified. You agree to pay all applicable fees and taxes. We use third-party payment processors and are not responsible for their actions or policies. Chargebacks or payment disputes may result in account suspension.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            9. Sponsorship and Advertising
          </h2>
          <p className="text-text leading-relaxed">
            Our Service may include sponsored content and advertisements. We are not responsible for the accuracy or reliability of such content. Sponsorship opportunities are subject to separate agreements and our approval.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            10. Privacy
          </h2>
          <p className="text-text leading-relaxed">
            Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, use, and protect your information.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            11. Disclaimers and Limitation of Liability
          </h2>
          <p className="text-text leading-relaxed">
            <strong>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> We disclaim all warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p className="text-text leading-relaxed">
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE.</strong>
          </p>
          <p className="text-text leading-relaxed">
            Our total liability to you for all claims arising out of or relating to these Terms or the Service shall not exceed the greater of $100 CAD or the amount you paid us in the 12 months preceding the claim.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            12. Indemnification
          </h2>
          <p className="text-text leading-relaxed">
            You agree to indemnify, defend, and hold harmless Jugnu and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including attorney's fees) arising out of or relating to your use of the Service, violation of these Terms, or infringement of any third-party rights.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            13. Termination
          </h2>
          <p className="text-text leading-relaxed">
            We may terminate or suspend your access to the Service immediately, without prior notice, for any reason, including violation of these Terms. Upon termination, your right to use the Service ceases immediately, and we may delete your account and content.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            14. Governing Law and Disputes
          </h2>
          <p className="text-text leading-relaxed">
            These Terms are governed by the laws of British Columbia, Canada, without regard to conflict of law principles. Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in Vancouver, British Columbia, or in the courts of British Columbia.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            15. Force Majeure
          </h2>
          <p className="text-text leading-relaxed">
            We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, pandemics, or government actions.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            16. Severability
          </h2>
          <p className="text-text leading-relaxed">
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect, and the invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            17. Changes to Terms
          </h2>
          <p className="text-text leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            18. Entire Agreement
          </h2>
          <p className="text-text leading-relaxed">
            These Terms, together with our Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and Jugnu regarding the Service and supersede all prior agreements and understandings.
          </p>

          <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
            19. Contact Information
          </h2>
          <p className="text-text leading-relaxed">
            If you have any questions about these Terms, please contact us at:
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
