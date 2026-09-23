/* Local place index and improved search UI notes. */
# Myanmar location search

The app now checks a curated Myanmar place index first, shows Burmese and English names plus state/region context, and falls back to Open-Meteo geocoding for places outside the local index. The API cannot guarantee every village or ward, so unknown places should be searched using the nearest township or English spelling.

Rainfall is shown from the provider's daily precipitation forecast. Flood and landslide cards are awareness indicators based on forecast rain totals, not official warnings.
