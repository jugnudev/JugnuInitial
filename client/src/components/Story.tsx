export default function Story() {
  return (
    <section id="story" className="py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-8">
            Our Story
          </h2>
          
          <div className="prose prose-lg prose-invert max-w-none">
            <p className="text-xl leading-relaxed text-muted mb-8">
              Jugnu means <span className="text-accent font-medium">firefly</span>. 
            </p>
            
            <p className="text-lg leading-relaxed text-text">
              We build nights that feel alive—where Bollywood meets global sounds, where strangers sync, 
              and the room finds one frequency. Like fireflies gathering in the darkness, we create moments 
              of collective illumination that transform ordinary evenings into unforgettable experiences.
            </p>
          </div>

          {/* Visual element */}
          <div className="mt-12 relative">
            <div className="absolute inset-0 bg-gradient-radial from-glow/20 via-transparent to-transparent rounded-full"></div>
            <div className="relative inline-flex items-center justify-center w-24 h-24 bg-primary/20 rounded-full">
              <i className="fas fa-music text-3xl text-accent"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
