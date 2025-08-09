import { Link } from "wouter";
import Layout from "@/components/Layout";

export default function Privacy() {
  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-muted hover:text-accent transition-colors duration-200 mb-6"
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
              At Jugnu, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, and protect your information when you use our website and services.
            </p>

            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
              Information We Collect
            </h2>
            <p className="text-text leading-relaxed">
              We collect information you provide directly to us, such as when you sign up for our 
              mailing list, purchase tickets, or contact us. This may include your name, email address, 
              and other contact information.
            </p>

            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-text leading-relaxed">
              We use the information we collect to provide and improve our services, communicate with 
              you about events and updates, and comply with legal obligations.
            </p>

            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-text leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:hello@jugnu.events" className="text-accent hover:underline">
                hello@jugnu.events
              </a>.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
