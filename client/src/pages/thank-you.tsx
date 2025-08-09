import { Link } from "wouter";
import Layout from "@/components/Layout";

export default function ThankYou() {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="relative">
            {/* Firefly glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-2xl"></div>
            <div className="relative bg-bg border border-white/10 rounded-2xl p-8">
              <div className="mb-6">
                <i className="fas fa-check-circle text-4xl text-accent mb-4"></i>
              </div>
              
              <h1 className="font-fraunces text-3xl font-bold tracking-tight text-primary mb-4">
                Welcome to the Frequency
              </h1>
              
              <p className="text-muted mb-6 leading-relaxed" aria-live="polite">
                You're now on the list! We'll let you know when the next drop is about to light up Vancouver.
              </p>
              
              <div className="space-y-4">
                <a
                  href="https://instagram.com/thehouseofjugnu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200"
                >
                  <i className="fab fa-instagram mr-2"></i>
                  Follow @thehouseofjugnu
                </a>
                
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-full px-6 py-3 border border-primary/55 text-text font-medium tracking-wide rounded-2xl hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
