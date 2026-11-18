import { describe, expect, it } from "vitest";
import { BOUNDS, blockState, frameState, sceneHeights, sceneOf, storyHeight } from "@/lib/journey";
import { journeyFrames } from "@/lib/journey-frames";
import { whatsappMessageUrl, whatsappRouteUrl } from "@/lib/public-shipping";

describe("Homepage scroll journey", () => {
  it("ships all 96 footage frames in order", () => {
    expect(journeyFrames).toHaveLength(96);
    expect(journeyFrames[0]).toContain("journey-frame-0001.jpg");
    expect(journeyFrames[95]).toContain("journey-frame-0096.jpg");
  });
  it("uses a 16000px story on desktop and 10500px on phones", () => {
    expect(storyHeight(1280)).toBe(16000);
    expect(storyHeight(344)).toBe(10500);
    expect(sceneHeights(16000).reduce((a, b) => a + b)).toBeCloseTo(16000, -1);
  });
  it("starts on the first frame and ends on the last", () => {
    expect(frameState(0).f).toBe(0);
    expect(frameState(1).f).toBe(95);
  });
  it("reaches the crane-lift frame at the end of the truck stage", () => {
    expect(frameState(BOUNDS[1] ?? 0).f).toBeCloseTo(15);
  });
  it("places progress in the route-map stage at the start of stage six", () => {
    expect(sceneOf((BOUNDS[4] ?? 0) + 0.001).i).toBe(5);
    expect(sceneOf(1).i).toBe(7);
  });
  it("hides a caption outside its window and shows it inside", () => {
    expect(blockState([.08, .25, .75, .95], 0).opacity).toBe(0);
    expect(blockState([.08, .25, .75, .95], .5).opacity).toBe(1);
  });
});

describe("Homepage WhatsApp links", () => {
  it("opens the supplied number with the default greeting", () => {
    expect(whatsappMessageUrl()).toBe("https://wa.me/6282336829960?text=" + encodeURIComponent("Halo CV MR EXPRESS, saya ingin menanyakan informasi pengiriman barang dari Surabaya."));
  });
  it("names the chosen destination when ordering from the route map", () => {
    expect(decodeURIComponent(whatsappRouteUrl("Jayapura").split("text=")[1] ?? "")).toBe("Halo CV MR EXPRESS, saya ingin menanyakan informasi pengiriman barang dari Surabaya ke Jayapura.");
  });
});
