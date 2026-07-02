**OBJECTIVE:**
Finalize the "Campus Suburbs Explorer" in `src/app/components/dashboard-map.tsx`. Replace all dummy lists with the full Australian University database and implement a live GeoJSON fetcher to highlight suburb boundaries as polygons.

**1. THE FULL DATABASE (Inject at the top of the file):**
```typescript
const UNIVERSITY_SUBURBS: Record<string, string[]> = {
  "Australian Catholic University": ["North Sydney", "Strathfield", "Fitzroy", "Banyo", "Ballarat"],
  "Australian National University": ["Acton", "Braddon", "O’Connor", "Turner", "Lyneham"],
  "Bond University": ["Robina", "Varsity Lakes", "Mermaid Beach", "Miami"],
  "Carnegie Mellon University Australia": ["Adelaide City", "North Adelaide", "Kent Town", "Brompton"],
  "Central Queensland University": ["Rockhampton", "Norman Gardens", "Frenchville", "Berserker", "Parkhurst"],
  "Charles Darwin University": ["Alawa", "Brinkin", "Nakara", "Lyons", "Tiwi"],
  "Charles Sturt University": ["Bathurst", "Wagga Wagga", "Estella", "Boorooma", "Kooringal"],
  "Curtin University": ["Bentley", "St James", "Victoria Park", "Waterford", "Karawara"],
  "Deakin University": ["Burwood", "Box Hill", "Highton", "Waurn Ponds", "Grovedale"],
  "Edith Cowan University": ["Joondalup", "Connolly", "Currambine", "Mount Lawley", "Menora"],
  "Federation University Australia": ["Mount Helen", "Buninyong", "Mount Clear", "Canadian"],
  "Flinders University": ["Bedford Park", "Clovelly Park", "Sturt", "Pasadena", "Mitchell Park"],
  "Griffith University": ["Southport", "Ashmore", "Nathan", "Mount Gravatt", "Upper Mount Gravatt"],
  "James Cook University": ["Douglas", "Annandale", "Smithfield", "Trinity Park"],
  "La Trobe University": ["Bundoora", "Kingsbury", "Macleod", "Reservoir", "Heidelberg West"],
  "Macquarie University": ["Marsfield", "North Ryde", "Macquarie Park", "Epping", "Eastwood"],
  "Monash University": ["Clayton", "Mulgrave", "Notting Hill", "Caulfield East", "Malvern East"],
  "Murdoch University": ["Murdoch", "Leeming", "Kardinya", "Winthrop", "Bull Creek"],
  "Queensland University of Technology": ["Kelvin Grove", "Herston", "Red Hill", "Brisbane City", "South Bank"],
  "RMIT University": ["Carlton", "Melbourne CBD", "North Melbourne", "Bundoora", "Mill Park"],
  "Southern Cross University": ["Bilinga", "Tugun", "Coolangatta", "Goonellabah", "Girards Hill"],
  "Swinburne University of Technology": ["Hawthorn", "Hawthorn East", "Richmond", "Kew", "Kooyong"],
  "Torrens University Australia": ["Adelaide CBD", "Surry Hills", "Pyrmont", "Fortitude Valley"],
  "University of Adelaide": ["North Adelaide", "Prospect", "Norwood", "Stepney", "Hackney"],
  "University of Canberra": ["Bruce", "Belconnen", "Aranda", "Lawson", "Kaleen"],
  "University of Divinity": ["Kew", "Box Hill", "Parkville", "Brighton", "Wantirna"],
  "University of Melbourne": ["Parkville", "Carlton", "North Melbourne", "Brunswick", "Fitzroy"],
  "University of New England": ["Armidale CBD", "Uralla", "Guyra", "Kellys Plains"],
  "University of New South Wales (UNSW)": ["Kensington", "Kingsford", "Randwick", "Maroubra", "Zetland"],
  "University of Newcastle": ["Jesmond", "Warabrook", "Birmingham Gardens", "Mayfield", "Wallsend"],
  "University of Notre Dame Australia": ["Fremantle", "East Fremantle", "Chippendale", "Broadway", "Ultimo"],
  "University of Queensland": ["St Lucia", "Toowong", "Taringa", "Indooroopilly", "Dutton Park"],
  "University of South Australia": ["Mawson Lakes", "Magill", "Pooraka", "Salisbury", "Adelaide CBD"],
  "University of Southern Queensland": ["Darling Heights", "Kearneys Spring", "Springfield Central", "Ipswich"],
  "University of Sydney": ["Darlington", "Newtown", "Glebe", "Forest Lodge", "Redfern"],
  "University of Tasmania": ["Sandy Bay", "Dynnyrne", "Newnham", "Mowbray", "Invermay"],
  "University of Technology Sydney": ["Ultimo", "Haymarket", "Chippendale", "Surry Hills", "Glebe"],
  "University of the Sunshine Coast": ["Sippy Downs", "Buderim", "Mountain Creek", "Palmview"],
  "University of Western Australia": ["Nedlands", "Subiaco", "Shenton Park", "Dalkeith", "Claremont"],
  "University of Wollongong": ["Keiraville", "Gwynneville", "North Wollongong", "Mount Ousley"],
  "Victoria University": ["Footscray", "Maribyrnong", "Maidstone", "Sunshine", "St Albans"],
  "Western Sydney University": ["Rydalmere", "Parramatta", "Kingswood", "Werrington", "Campbelltown"]
};
2. STATE & API LOGIC:

Add selectedUni (default: user's university from profile or "University of Melbourne"), highlightedSuburbData (any | null), and isExplorerOpen (boolean).

Create handleSuburbClick(suburbName):

Fetch from Nominatim: https://nominatim.openstreetmap.org/search?q=${suburbName},+Australia&format=geojson&polygon_geojson=1&limit=1.

Set isGlobe(false) and projection({ type: 'mercator' }).

Use mapRef.current?.getMap().flyTo({ center: [lng, lat], zoom: 14.5, pitch: 45, duration: 3000, essential: true }).

3. MAP LAYERS (Inside the <Map> component):
Render a GeoJSON <Source> and <Layer> if highlightedSuburbData exists.

Use a Fill Layer (#3b82f6, 0.2 opacity) to highlight the area.

Use a Line Layer (#2563eb, width 2) for the boundary.

4. INTERACTION & EXIT:

Clicking the "X" on the explorer panel must:

Clear highlightedSuburbData.

Set isGlobe(true) and projection({ type: 'globe' }).

Cinematic flyTo back to the Globe view (zoom: 2.2, center: [133.7751, -25.2744]).

CRITICAL GUARDRAILS:

Maintain the literal MapTiler API key.

Preserve the existing "Report Scam" buttons and search bar functionality.

Ensure the suburb list is scrollable within the panel if it exceeds 5 items.