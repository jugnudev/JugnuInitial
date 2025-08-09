// Minimal vendor stubs. These are intentionally NO-OPs until you choose a platform.

let eventbriteLoaded = false;
let ticketTailorLoaded = false;

export async function openEventbriteCheckout(eventId: string) {
  // TODO: Load Eventbrite widget script once, then open modal.
  // Example (when you're ready):
  // if (!eventbriteLoaded) {
  //   await loadScript("https://www.eventbrite.com/static/widgets/eb_widgets.js");
  //   eventbriteLoaded = true;
  // }
  // // @ts-ignore - EB global after script load
  // window.EBWidgets.createWidget({
  //   widgetType: "checkout",
  //   eventId,
  //   modal: true
  // });
  console.warn("[ticketing] Eventbrite modal not wired yet. eventId=", eventId);
}

export async function openTicketTailorCheckout(eventId: string) {
  // TODO: Load Ticket Tailor script once, then open modal.
  // Example (when you're ready):
  // if (!ticketTailorLoaded) {
  //   await loadScript("https://cdn.tickettailor.com/js/widgets/min/widget.js");
  //   ticketTailorLoaded = true;
  // }
  // // @ts-ignore - TT global after script load
  // window.TicketTailor.embed(eventId, { modal: true });
  console.warn("[ticketing] Ticket Tailor modal not wired yet. eventId=", eventId);
}

// Optional helper for future script loading
export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
