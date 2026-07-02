import alertsIcon from '../../assets/setu-malaysia-icons/alerts.png';
import arrivalIcon from '../../assets/setu-malaysia-icons/arrival.png';
import chatActiveIcon from '../../assets/setu-malaysia-icons/chat-active.png';
import chatInactiveIcon from '../../assets/setu-malaysia-icons/chat-inactive.png';
import eventsIcon from '../../assets/setu-malaysia-icons/events.png';
import gamesIcon from '../../assets/setu-malaysia-icons/games.png';
import healthIcon from '../../assets/setu-malaysia-icons/health.png';
import homeActiveIcon from '../../assets/setu-malaysia-icons/home-active.png';
import homeInactiveIcon from '../../assets/setu-malaysia-icons/home-inactive.png';
import infoIcon from '../../assets/setu-malaysia-icons/info.png';
import jobsIcon from '../../assets/setu-malaysia-icons/jobs.png';
import mapsIcon from '../../assets/setu-malaysia-icons/maps.png';
import profileActiveIcon from '../../assets/setu-malaysia-icons/profile-active.png';
import profileInactiveIcon from '../../assets/setu-malaysia-icons/profile-inactive.png';
import resourcesActiveIcon from '../../assets/setu-malaysia-icons/resources-active.png';
import resourcesInactiveIcon from '../../assets/setu-malaysia-icons/resources-inactive.png';
import suburbsIcon from '../../assets/setu-malaysia-icons/suburbs.png';
import tfnIcon from '../../assets/setu-malaysia-icons/tfn.png';
import toiletIcon from '../../assets/setu-malaysia-icons/toilet.png';
import vibeActiveIcon from '../../assets/setu-malaysia-icons/vibe-active.png';
import vibeInactiveIcon from '../../assets/setu-malaysia-icons/vibe-inactive.png';
import type { View } from '../components/nav-bar';

export const setuMalaysiaNavIcons: Partial<Record<View, { active: string; inactive: string }>> = {
  dashboard: { active: homeActiveIcon, inactive: homeInactiveIcon },
  vibe: { active: vibeActiveIcon, inactive: vibeInactiveIcon },
  arrival: { active: chatActiveIcon, inactive: chatInactiveIcon },
  resources: { active: resourcesActiveIcon, inactive: resourcesInactiveIcon },
  profile: { active: profileActiveIcon, inactive: profileInactiveIcon },
};

export const setuMalaysiaShortcutIcons = {
  alerts: alertsIcon,
  arrival: arrivalIcon,
  chat: chatActiveIcon,
  chatInactive: chatInactiveIcon,
  events: eventsIcon,
  games: gamesIcon,
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
