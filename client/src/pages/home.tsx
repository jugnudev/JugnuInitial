import Hero from "@/components/Hero";
import Events from "@/components/Events";
import Gallery from "@/components/Gallery";
import Story from "@/components/Story";
import { HomeMidSpotlight } from "@/components/spotlight/HomeMidSpotlight";

export default function Home() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Jugnu",
            url: "https://jugnu.events",
            logo: "https://jugnu.events/logo.svg",
            description: "Curated South Asian & global culture—nights, pop-ups, and experiences in Vancouver.",
            sameAs: ["https://instagram.com/thehouseofjugnu"],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "Customer Service",
              areaServed: "Vancouver, BC"
            }
          })
        }}
      />
      
      <Hero />
      <Events />
      <HomeMidSpotlight />
      <Gallery />
      <Story />
    </>
  );
}
