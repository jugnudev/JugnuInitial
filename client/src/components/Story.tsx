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
            
            <p className="text-lg leading-relaxed text-text">We chose the firefly because it isn’t the loudest thing in the dark.
            It’s a quiet signal—a small, living spark that says “I’m here.”
            Fireflies find each other by frequency. Some even synchronize—not by shouting, but by listening and answering back.
            That’s our ethos: bring your light, and watch the room respond.

            Jugnu is for the ones who glow on their own—and brighter together.
            For diasporas and dreamers, for classics and new sounds, for culture that doesn’t need permission.
            We curate spaces that feel like home and discovery in the same breath:
            Bollywood at the core, the world at the edges, and a city learning to shine.

            Small sparks. Big nights. Lasting memory.
            Find Your Frequency.</p>
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
