export const whatsappUrl = "https://wa.me/6282336829960";
export const whatsappDisplay = "0823 3682 9960";
export const socialLinks = [
  { name: "Facebook", handle: "cvmrexpress", url: "https://www.facebook.com/cvmrexpress" },
  { name: "Instagram", handle: "@cvmrexpress7", url: "https://www.instagram.com/cvmrexpress7?evlk=MXczaDJqa3pxaDQ5dQ==" },
  { name: "TikTok", handle: "@cvmrexpress7", url: "https://www.tiktok.com/@cvmrexpress7?_r=1&_t=ZS-9BYTigHlPJo" },
  { name: "Google", handle: "CV MR EXPRESS", url: "https://share.google/nyp9vRMK6vsn8Isrl" },
] as const;
export const originPort = { city: "Surabaya", port: "Pelabuhan Tanjung Perak", region: "Jawa Timur" };
/** Estimates (days) come from the supplied service info; ports are the PELNI calling ports of each city. */
export const destinations = [
  { name: "Ambon", days: 4, region: "Maluku", port: "Pelabuhan Yos Sudarso" },
  { name: "Tual", days: 4, region: "Maluku", port: "Pelabuhan Tual" },
  { name: "Ternate", days: 5, region: "Maluku Utara", port: "Pelabuhan Ahmad Yani" },
  { name: "Kaimana", days: 5, region: "Papua Barat", port: "Pelabuhan Kaimana" },
  { name: "Sorong", days: 5, region: "Papua Barat Daya", port: "Pelabuhan Sorong" },
  { name: "Fak Fak", days: 6, region: "Papua Barat", port: "Pelabuhan Fakfak" },
  { name: "Manokwari", days: 6, region: "Papua Barat", port: "Pelabuhan Manokwari" },
  { name: "Nabire", days: 6, region: "Papua Tengah", port: "Pelabuhan Samabusa" },
  { name: "Wasior", days: 6, region: "Papua Barat", port: "Pelabuhan Wasior" },
  { name: "Serui", days: 6, region: "Papua", port: "Pelabuhan Serui" },
  { name: "Jayapura", days: 7, region: "Papua", port: "Pelabuhan Jayapura" },
];
export const regions = [...new Set(destinations.map(d => d.region))];
export function publicHead(title: string, description: string, path: string) {
  return { meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "index, follow" },
  ], links: [{ rel: "canonical", href: path }] };
}
export const whatsappGreeting = "Halo CV MR EXPRESS, saya ingin menanyakan informasi pengiriman barang dari Surabaya.";
export function whatsappMessageUrl(message = whatsappGreeting) {
  return `${whatsappUrl}?text=${encodeURIComponent(message)}`;
}
export function whatsappRouteUrl(destination: string) {
  return whatsappMessageUrl(`Halo CV MR EXPRESS, saya ingin menanyakan informasi pengiriman barang dari Surabaya ke ${destination}.`);
}

export type Inquiry = { name: string; destination: string; cargo: string; note: string };
/** Builds the WhatsApp message from the contact form; empty fields are left out. */
export function whatsappInquiryUrl(f: Inquiry) {
  const lines = ["Halo CV MR EXPRESS, saya ingin menanyakan pengiriman barang dari Surabaya."];
  const add = (label: string, v: string) => { const t = v.trim(); if (t) lines.push(`${label}: ${t}`); };
  add("Nama", f.name); add("Kota tujuan", f.destination); add("Jenis barang", f.cargo); add("Catatan", f.note);
  return whatsappMessageUrl(lines.join("\n"));
}
