import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOODIE_SHARE_CARD_SPECS, HoodieShareCard } from "./hoodie-share-card";

describe("hoodie share card layout", () => {
  it("locks instagram post and story export dimensions", () => {
    expect(HOODIE_SHARE_CARD_SPECS.feed).toMatchObject({
      width: 1080,
      height: 1350,
    });
    expect(HOODIE_SHARE_CARD_SPECS.story).toMatchObject({
      width: 1080,
      height: 1920,
    });
  });

  it("keeps story title content inside a centered 1610px safe area", () => {
    expect(HOODIE_SHARE_CARD_SPECS.story.contentInsetTop).toBe(155);
    expect(HOODIE_SHARE_CARD_SPECS.story.contentInsetBottom).toBe(155);
    expect(
      HOODIE_SHARE_CARD_SPECS.story.height -
        HOODIE_SHARE_CARD_SPECS.story.contentInsetTop -
        HOODIE_SHARE_CARD_SPECS.story.contentInsetBottom,
    ).toBe(1610);
  });

  it("renders guide overlay copy for instagram exports", () => {
    const markup = renderToStaticMarkup(
      createElement(HoodieShareCard, {
        format: "story",
        data: {
          tone: "guide",
          title: "10 Best Historical Places in Sydney",
          eyebrowText: "Check this out",
          renderStyle: "photo",
          backgroundImageUrl: "https://images.example.com/guide-banner.jpg",
          backgroundPosition: "center center",
        },
      }),
    );

    expect(markup).toContain("Check this out");
    expect(markup).toContain("10 Best Historical Places in Sydney");
    expect(markup).toContain('data-hoodie-share-background-image="true"');
    expect(markup).toContain('src="https://images.example.com/guide-banner.jpg"');
    expect(markup).toContain("object-fit:cover");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("top:58px;right:54px;width:108px");
    expect(markup).not.toContain("Join me for");
    expect(markup).not.toContain("Open in Hoodie");
    expect(markup).not.toContain("Shared from Hoodie");
    expect(markup).not.toContain("10 places");
  });

  it("renders event overlay copy for instagram exports", () => {
    const markup = renderToStaticMarkup(
      createElement(HoodieShareCard, {
        format: "feed",
        data: {
          tone: "event",
          title: "Laneway Festival",
          eyebrowText: "Check out",
          renderStyle: "photo",
          backgroundImageUrl: "https://images.example.com/laneway.jpg",
          backgroundPosition: "center center",
        },
      }),
    );

    expect(markup).toContain("Check out");
    expect(markup).toContain("Laneway Festival");
    expect(markup).not.toContain("Join me for");
  });

  it("renders invite-led plan overlay copy for instagram exports", () => {
    const markup = renderToStaticMarkup(
      createElement(HoodieShareCard, {
        format: "story",
        data: {
          tone: "plan",
          title: "Laneway Festival",
          eyebrowText: "Join me for",
          renderStyle: "photo",
          backgroundImageUrl: "https://images.example.com/laneway-plan.jpg",
          backgroundPosition: "center center",
        },
      }),
    );

    expect(markup).toContain("Join me for");
    expect(markup).toContain("Laneway Festival");
  });

  it("renders suburb dashboard content for photo-led instagram exports", () => {
    const markup = renderToStaticMarkup(
      createElement(HoodieShareCard, {
        format: "feed",
        data: {
          tone: "suburb",
          title: "Campbelltown",
          eyebrowText: "Explore",
          insightBadgeText: "Cultural Infrastructure",
          summaryText:
            "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
          statTiles: [
            { label: "Crime score", value: "67" },
            { label: "Personal safety", value: "59" },
            { label: "Property crime", value: "70" },
            { label: "Tertiary students", value: "786" },
          ],
          renderStyle: "photo",
          backgroundImageUrl: "https://images.example.com/campbelltown.jpg",
          backgroundPosition: "center center",
        },
      }),
    );

    expect(markup).toContain("Explore");
    expect(markup).toContain("Campbelltown");
    expect(markup).toContain("Cultural Infrastructure");
    expect(markup).toContain("Crime score");
    expect(markup).toContain("Personal safety");
    expect(markup).toContain("Property crime");
    expect(markup).toContain("Tertiary students");
    expect(markup).toContain(
      "Campbelltown blends strong student momentum with a practical day-to-day rhythm.",
    );
    expect(markup).toContain('data-hoodie-share-background-image="true"');
    expect(markup).toContain('src="https://images.example.com/campbelltown.jpg"');
    expect(markup).toContain("object-fit:cover");
    expect(markup).not.toContain("High Match");
    expect(markup).not.toContain("Suburb Score");
  });
});
