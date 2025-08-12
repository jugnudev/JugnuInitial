import { ReactNode } from "react";

interface PageHeroProps {
  title: string;
  subtitle: string;
  pill?: string;
  actions?: ReactNode;
}

export default function PageHero({ title, subtitle, pill, actions }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background with subtle copper specks */}
      <div className="absolute inset-0 bg-gradient-radial from-[#1a1a1a] via-[#0f0f0f] to-[#050505]">
        {/* Firefly layer at reduced opacity */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(212, 105, 26, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(180, 80, 13, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(184, 84, 13, 0.1) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center">
          {pill && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              {pill}
            </div>
          )}
          
          <h1 className="font-fraunces text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            {title}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted max-w-prose mx-auto leading-relaxed mb-8">
            {subtitle}
          </p>

          {actions && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}