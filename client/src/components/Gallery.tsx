import { useState } from "react";
import { useGallery } from "@/lib/events";
import Lightbox from "./Lightbox";

export default function Gallery() {
  const { data: galleryImages = [], isLoading } = useGallery();
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);

  if (galleryImages.length === 0 && !isLoading) {
    // Hide gallery section if no images, but keep anchor for navigation
    return <div id="gallery" className="hidden"></div>;
  }

  if (isLoading) {
    return (
      <section id="gallery" className="py-12 lg:py-16 bg-gradient-to-b from-transparent to-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-4">
              Gallery
            </h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">
              Moments when the frequency aligned
            </p>
          </div>
          <div className="masonry">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="masonry-item">
                <div className="animate-pulse bg-white/10 rounded-2xl h-64"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="py-12 lg:py-16 bg-gradient-to-b from-transparent to-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-4">
            Gallery
          </h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Moments when the frequency aligned
          </p>
        </div>

        {/* Masonry Grid */}
        <div className="masonry">
          {galleryImages.map((image, index) => (
            <div key={index} className="masonry-item">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full rounded-2xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer"
                loading="lazy"
                onClick={() => setSelectedImage(image)}
                data-testid={`gallery-image-${index}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <Lightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </section>
  );
}
