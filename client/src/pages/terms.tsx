import { Link } from "wouter";
import Layout from "@/components/Layout";

export default function Terms() {
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
              Terms of Service
            </h1>
            <p className="text-muted">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg prose-invert max-w-none">
            <p className="text-text leading-relaxed">
              Welcome to Jugnu. These Terms of Service govern your use of our website and services. 
              By using our services, you agree to these terms.
            </p>

            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
              Use of Services
            </h2>
            <p className="text-text leading-relaxed">
              You may use our services only for lawful purposes and in accordance with these Terms. 
              You agree not to use our services in any way that could damage, disable, or impair our services.
            </p>

            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
              Event Tickets
            </h2>
            <p className="text-text leading-relaxed">
              Ticket purchases are subject to availability and our refund policy. All sales are final 
              unless otherwise specified for a particular event.
            </p>

            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-primary mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-text leading-relaxed">
              If you have any questions about these Terms, please contact us at{" "}
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
