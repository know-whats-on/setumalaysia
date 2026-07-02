import { describe, expect, it } from 'vitest';
import { COUNCIL_WHATS_ON_LINKS } from './council-whats-on-links';

describe('council whats on links', () => {
  it('keeps City of Sydney first and sorts the rest alphabetically', () => {
    expect(COUNCIL_WHATS_ON_LINKS[0]).toMatchObject({
      slug: 'city-of-sydney',
      label: 'City of Sydney',
    });

    const remainingLabels = COUNCIL_WHATS_ON_LINKS
      .slice(1)
      .map((council) => council.label);

    expect(remainingLabels).toEqual([...remainingLabels].sort((left, right) => left.localeCompare(right)));
  });

  it('links Bayside Council to the official What’s On page', () => {
    expect(COUNCIL_WHATS_ON_LINKS.find((council) => council.slug === 'bayside-council')).toMatchObject({
      label: 'Bayside Council',
      url: 'https://www.bayside.nsw.gov.au/whats-on',
    });
  });
});
