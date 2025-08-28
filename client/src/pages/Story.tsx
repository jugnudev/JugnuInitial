import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Story() {

  return (
    <div className="min-h-screen bg-gradient-radial from-[#1a1a1a] via-[#0f0f0f] to-[#050505] relative overflow-hidden">
      {/* Animated background fireflies */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400 rounded-full shadow-glow"
            initial={{ 
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{
              x: [null, Math.random() * window.innerWidth],
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 0.8, 0]
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "easeInOut"
            }}
            style={{
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.8)'
            }}
          />
        ))}
      </div>
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1 
              className="font-fraunces text-6xl lg:text-7xl font-bold tracking-tight mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 bg-clip-text text-[#c86712]">
                The House of Jugnu
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-2xl leading-relaxed mb-4 text-[#c96814]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              जुगनू • Firefly
            </motion.p>

            <motion.p 
              className="text-xl text-muted max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
            >
              A quiet signal in the dark—a living spark that whispers "I'm here"
            </motion.p>
          </motion.div>
        </div>
      </section>
      {/* Main Story Content */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="space-y-12"
          >
            {/* The Firefly Philosophy */}
            <motion.div 
              className="bg-white/5 backdrop-blur-md rounded-3xl p-8 lg:p-12 border border-amber-500/20"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h2 className="font-fraunces text-3xl lg:text-4xl font-bold mb-6 text-[#c76613]">
                Why Fireflies?
              </h2>
              <p className="text-lg leading-relaxed text-text mb-6">
                Fireflies aren't the loudest creatures in the night. They don't roar or screech for attention. 
                Instead, they communicate through light—through frequency—finding each other in the darkness 
                with gentle, rhythmic pulses.
              </p>
              <p className="text-lg leading-relaxed text-text">
                Some species even synchronize their glow, creating waves of light that ripple through the night. 
                Not by shouting over each other, but by listening, responding, and finding harmony in the collective rhythm.
              </p>
            </motion.div>

            {/* Our Ethos */}
            <motion.div 
              className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-md rounded-3xl p-8 lg:p-12 border border-amber-500/20"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-fraunces text-3xl lg:text-4xl font-bold mb-6 text-[#c76613]">
                Our Ethos
              </h2>
              <p className="text-lg leading-relaxed text-text mb-6">
                <span className="font-semibold text-[#c76613]">Bring your light, and watch the room respond.</span>
              </p>
              <p className="text-lg leading-relaxed text-text">Jugnu is for the ones who glow on their own—and burn brighter together. For diasporas and dreamers, for classics and new sounds, for culture that doesn't need permission. We showcase spaces that feel like home and discovery in the same breath. We have no competition, because we're here for the whole community - supporting both those who provide experiences, and those who participate in them. </p>
            </motion.div>

            {/* The Community */}
            <motion.div 
              className="bg-white/5 backdrop-blur-md rounded-3xl p-8 lg:p-12 border border-amber-500/20"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-fraunces text-3xl lg:text-4xl font-bold mb-6 text-[#c76613]">
                A Living Ecosystem
              </h2>
              <p className="text-lg leading-relaxed text-text mb-6">
                Like fireflies gathering at dusk, our community forms an ecosystem of light. 
                Each person brings their unique frequency—their story, their culture, their energy—creating 
                a tapestry of experiences that illuminates Vancouver's cultural landscape.
              </p>
              <p className="text-lg leading-relaxed text-text">From intimate gatherings to grand celebrations, from traditional melodies to fusion beats, we're building bridges between generations and cultures, one spark at a time. Jugnu doesn't pick and choose what to support. We showcase our culture as it is, presenting you with every opportunity - all in one place.</p>
            </motion.div>

            {/* The Vision */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="absolute inset-0 bg-gradient-radial from-amber-500/20 via-transparent to-transparent blur-3xl" />
              <div className="relative bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-md rounded-3xl p-8 lg:p-12 border border-amber-500/30">
                <h2 className="font-fraunces text-3xl lg:text-4xl font-bold mb-6 text-[#c76613]">
                  The Magic We Create
                </h2>
                <p className="text-lg leading-relaxed text-text mb-6">Jugnu isn’t just your favourite hub for South Asian culture. Here, you’ll discover experiences first—and in utmost clarity. Thanks to our growing network of partners, we’re bringing you deals that make these experiences more accessible—from discounts at your favourite places to eat to tickets for your next night out. Share our culture and embrace it fully.</p>
                <div className="mt-8 p-6 bg-black/30 rounded-2xl">
                  <p className="text-2xl font-fraunces text-center leading-relaxed text-[#c76613]">
                    Small sparks. Big nights. Lasting memories.
                  </p>
                  <p className="text-xl text-center text-amber-400 mt-4 font-semibold">
                    Find Your Frequency.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Call to Action */}
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <p className="text-xl text-muted mb-8">
                Join us in illuminating the night, one gathering at a time.
              </p>
              <motion.a
                href="/events"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold rounded-full transition-all transform hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-explore-events"
              >
                Upcoming Events
                <span className="text-lg">✨</span>
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}