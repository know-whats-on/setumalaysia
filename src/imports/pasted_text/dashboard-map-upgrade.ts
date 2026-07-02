**OBJECTIVE:**
Upgrade the "Campus Suburbs Explorer" in `src/app/components/dashboard-map.tsx`. Replace the dummy university list with a comprehensive Australian database and implement a live "Area Highlighting" system that renders suburb boundaries as polygons on the map.

**1. THE DATA ENGINE (Replace the mock constants):**
Add this comprehensive university-to-suburbs mapping constant at the top of the file:
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
2. THE AREA HIGHLIGHT ENGINE:

State Logic: Add suburbGeoJSON (any | null) and isLoadingSuburb (boolean) to the state.

Async Fetcher: Create a function fetchSuburbBoundary(suburbName: string). It must call the free Nominatim API to get the high-resolution area boundary:
https://nominatim.openstreetmap.org/search?q=${suburbName},+Australia&format=geojson&polygon_geojson=1&limit=1

Map Layer Rendering: Inside the <Map> component, use <Source> and <Layer> to render the suburbGeoJSON.

Use a Fill Layer with a semi-transparent blue color (#3b82f6 with 15% opacity).

Use a Line Layer with a solid blue border (#2563eb, width: 2) to define the area perfectly.

3. UI & TRANSITION LOGIC:

Default Uni: If a userProfile.university exists, set it as the default selectedUni. Otherwise, default to "University of Melbourne".

On Suburb Click: -   Set isGlobe(false) to flatten the map.

Call fetchSuburbBoundary(suburbName).

Once fetched, call mapRef.current?.getMap().flyTo({ center: [lng, lat], zoom: 14, pitch: 45, duration: 2500, essential: true }) using the coordinates from the API result.

On Explorer Close (X Button): -   Clear suburbGeoJSON.

Set isGlobe(true).

Roll back to Globe: Execute a cinematic flyTo back to the full Earth view (zoom: 2.2, center: [133.7751, -25.2744]).

CRITICAL GUARDRAILS:

Ensure the property/incident markers remain visible on top of the highlighted suburb area.

Do NOT change the MapTiler API key or the map style.

Ensure the isGlobe state and the requestAnimationFrame spin engine are correctly updated to handle the "roll back" zoom-out.