import Hero from "@/components/Hero";
import Events from "@/components/Events";
import Gallery from "@/components/Gallery";
import ThisWeekEvents from "@/components/ThisWeekEvents";
import PartnerWithUs from "@/components/PartnerWithUs";
import { HomeMidSpotlight } from "@/components/spotlight/HomeMidSpotlight";
import NewsletterSignup from "@/components/NewsletterSignup";

export default function Home() {
  // Get current date for dynamic meta tags
  const currentDate = new Date().toISOString();
  
  return (
    <>
      {/* Enhanced SEO Meta Tags */}
      <link rel="canonical" href="https://thehouseofjugnu.com" />
      <meta name="description" content="Discover South Asian culture in Vancouver. Find concerts, festivals, cultural performances & community events. Join Vancouver's premier cultural platform for South Asian experiences." />
      <meta name="keywords" content="South Asian events Vancouver, Indian events Vancouver, Pakistani events Vancouver, cultural events Vancouver, Jugnu events, Metro Vancouver concerts, South Asian community Vancouver" />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content="Jugnu - Find Your Frequency | South Asian Culture in Vancouver" />
      <meta property="og:description" content="Curated South Asian & global culture—nights, pop-ups, and experiences in Vancouver. Discover events, join the community." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://thehouseofjugnu.com" />
      <meta property="og:image" content="https://thehouseofjugnu.com/og-image.jpg" />
      <meta property="og:locale" content="en_CA" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Jugnu - South Asian Culture in Vancouver" />
      <meta name="twitter:description" content="Discover concerts, festivals & cultural events. Join Vancouver's premier South Asian cultural platform." />
      <meta name="twitter:image" content="https://thehouseofjugnu.com/twitter-card.jpg" />
      
      {/* Enhanced JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Jugnu",
            alternateName: "The House of Jugnu",
            url: "https://thehouseofjugnu.com",
            logo: "https://thehouseofjugnu.com/logo.svg",
            description: "Curated South Asian & global culture—nights, pop-ups, and experiences in Vancouver.",
            sameAs: [
              "https://instagram.com/thehouseofjugnu",
              "https://facebook.com/thehouseofjugnu"
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "Customer Service",
              areaServed: "Vancouver, BC",
              availableLanguage: ["English", "Hindi", "Punjabi", "Urdu"]
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Vancouver",
              addressRegion: "BC",
              addressCountry: "CA"
            },
            foundingDate: "2023",
            knowsAbout: ["South Asian Culture", "Music Events", "Cultural Festivals", "Community Events"],
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Event Sponsorship Packages",
              itemListElement: [
                {
                  "@type": "Offer",
                  name: "Events Spotlight",
                  price: "60.00",
                  priceCurrency: "CAD",
                  availability: "https://schema.org/InStock"
                },
                {
                  "@type": "Offer",
                  name: "Homepage Hero",
                  price: "140.00",
                  priceCurrency: "CAD",
                  availability: "https://schema.org/InStock"
                }
              ]
            }
          })
        }}
      />
      
      {/* BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://thehouseofjugnu.com"
              }
            ]
          })
        }}
      />
      
      {/* LocalBusiness Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Jugnu",
            image: "https://thehouseofjugnu.com/logo.svg",
            "@id": "https://thehouseofjugnu.com",
            url: "https://thehouseofjugnu.com",
            telephone: "",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Vancouver",
              addressRegion: "BC",
              addressCountry: "CA"
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: 49.2827,
              longitude: -123.1207
            },
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              opens: "00:00",
              closes: "23:59"
            },
            priceRange: "$$"
          })
        }}
      />
      
      <Hero />
      <HomeMidSpotlight />
      <ThisWeekEvents />
      <Events />
      <PartnerWithUs />
      <Gallery />
      <NewsletterSignup />
    </>
  );
}
