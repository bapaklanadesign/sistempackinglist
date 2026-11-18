import { describe, expect, it } from "vitest";
import { destinations, originPort, publicHead, whatsappInquiryUrl, whatsappUrl } from "@/lib/public-shipping";
describe("Reference-backed shipping information", () => {
  it("uses the supplied WhatsApp number in international format", () => {
    expect(whatsappUrl).toBe("https://wa.me/6282336829960");
  });
  it.each([
    ["Ambon", 4], ["Tual", 4], ["Ternate", 5], ["Kaimana", 5], ["Sorong", 5],
    ["Fak Fak", 6], ["Manokwari", 6], ["Nabire", 6], ["Wasior", 6], ["Serui", 6], ["Jayapura", 7],
  ])("keeps %s at the supplied estimate of %i days", (name, days) => {
    expect(destinations.find(d => d.name === name)?.days).toBe(days);
  });
  it("marks public pages indexable with a self-referencing canonical path", () => {
    const head = publicHead("Judul", "Deskripsi", "/layanan");
    expect(head.meta).toContainEqual({ name: "robots", content: "index, follow" });
    expect(head.links).toContainEqual({ rel: "canonical", href: "/layanan" });
  });
  it("departs every route from Pelabuhan Tanjung Perak, Surabaya", () => {
    expect(originPort).toMatchObject({ city: "Surabaya", port: "Pelabuhan Tanjung Perak" });
  });
  it.each([["Ambon", "Pelabuhan Yos Sudarso"], ["Ternate", "Pelabuhan Ahmad Yani"], ["Nabire", "Pelabuhan Samabusa"], ["Jayapura", "Pelabuhan Jayapura"]])("lists %s with destination port %s", (name, port) => {
    expect(destinations.find(d => d.name === name)?.port).toBe(port);
  });
  it("sends the contact form to the company WhatsApp with only the filled fields", () => {
    const url = new URL(whatsappInquiryUrl({ name: " Budi ", destination: "Sorong", cargo: "", note: "5 koli" }));
    expect(url.origin + url.pathname).toBe("https://wa.me/6282336829960");
    expect(url.searchParams.get("text")).toBe("Halo CV MR EXPRESS, saya ingin menanyakan pengiriman barang dari Surabaya.\nNama: Budi\nKota tujuan: Sorong\nCatatan: 5 koli");
  });
});
