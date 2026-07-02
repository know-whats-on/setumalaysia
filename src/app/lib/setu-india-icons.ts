import alertsIcon from '../../assets/setu-india-icons/alerts.png';
import arrivalIcon from '../../assets/setu-india-icons/arrival.png';
import chatActiveIcon from '../../assets/setu-india-icons/chat-active.png';
import chatInactiveIcon from '../../assets/setu-india-icons/chat-inactive.png';
import eventsIcon from '../../assets/setu-india-icons/events.png';
import healthIcon from '../../assets/setu-india-icons/health.png';
import homeActiveIcon from '../../assets/setu-india-icons/home-active.png';
import homeInactiveIcon from '../../assets/setu-india-icons/home-inactive.png';
import infoIcon from '../../assets/setu-india-icons/info.png';
import jobsIcon from '../../assets/setu-india-icons/jobs.png';
import mapsIcon from '../../assets/setu-india-icons/maps.png';
import profileActiveIcon from '../../assets/setu-india-icons/profile-active.png';
import profileInactiveIcon from '../../assets/setu-india-icons/profile-inactive.png';
import resourcesActiveIcon from '../../assets/setu-india-icons/resources-active.png';
import resourcesInactiveIcon from '../../assets/setu-india-icons/resources-inactive.png';
import gamesRhinoIcon from '../../assets/setu-india-games-rhino.png';
import suburbsIcon from '../../assets/setu-india-icons/suburbs.png';
import tfnIcon from '../../assets/setu-india-icons/tfn.png';
import toiletIcon from '../../assets/setu-india-icons/toilet.png';
import vibeActiveIcon from '../../assets/setu-india-icons/vibe-active.png';
import vibeInactiveIcon from '../../assets/setu-india-icons/vibe-inactive.png';
import type { View } from '../components/nav-bar';

export const setuIndiaNavIcons: Partial<Record<View, { active: string; inactive: string }>> = {
  dashboard: { active: homeActiveIcon, inactive: homeInactiveIcon },
  vibe: { active: vibeActiveIcon, inactive: vibeInactiveIcon },
  arrival: { active: chatActiveIcon, inactive: chatInactiveIcon },
  resources: { active: resourcesActiveIcon, inactive: resourcesInactiveIcon },
  profile: { active: profileActiveIcon, inactive: profileInactiveIcon },
};

export const setuIndiaShortcutIcons = {
  alerts: alertsIcon,
  arrival: arrivalIcon,
  chat: chatActiveIcon,
  chatInactive: chatInactiveIcon,
  events: eventsIcon,
  games: gamesRhinoIcon,
  health: healthIcon,
  home: homeActiveIcon,
  info: infoIcon,
  jobs: jobsIcon,
  map: mapsIcon,
  profile: profileActiveIcon,
  resources: resourcesActiveIcon,
  suburbs: suburbsIcon,
  tfn: tfnIcon,
  toilet: toiletIcon,
  vibe: vibeActiveIcon,
};
