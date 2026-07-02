import alertsIcon from '../../assets/wolli-icons/alerts.png';
import arrivalIcon from '../../assets/wolli-icons/arrival.png';
import chatActiveIcon from '../../assets/wolli-icons/chat-active.png';
import chatInactiveIcon from '../../assets/wolli-icons/chat-inactive.png';
import checklistIcon from '../../assets/wolli-icons/checklist.png';
import eventsIcon from '../../assets/wolli-icons/events.png';
import gamesIcon from '../../assets/wolli-icons/games.png';
import healthIcon from '../../assets/wolli-icons/health.png';
import homeActiveIcon from '../../assets/wolli-icons/home-active.png';
import homeInactiveIcon from '../../assets/wolli-icons/home-inactive.png';
import infoIcon from '../../assets/wolli-icons/info.png';
import jobsIcon from '../../assets/wolli-icons/jobs.png';
import mapsIcon from '../../assets/wolli-icons/maps.png';
import profileActiveIcon from '../../assets/wolli-icons/profile-active.png';
import profileInactiveIcon from '../../assets/wolli-icons/profile-inactive.png';
import resourcesActiveIcon from '../../assets/wolli-icons/resources-active.png';
import resourcesInactiveIcon from '../../assets/wolli-icons/resources-inactive.png';
import suburbsIcon from '../../assets/wolli-icons/suburbs.png';
import toiletIcon from '../../assets/wolli-icons/toilet.png';
import vibeActiveIcon from '../../assets/wolli-icons/vibe-active.png';
import vibeInactiveIcon from '../../assets/wolli-icons/vibe-inactive.png';
import type { View } from '../components/nav-bar';

export const wolliNavIcons: Partial<Record<View, { active: string; inactive: string }>> = {
  dashboard: { active: homeActiveIcon, inactive: homeInactiveIcon },
  vibe: { active: vibeActiveIcon, inactive: vibeInactiveIcon },
  arrival: { active: chatActiveIcon, inactive: chatInactiveIcon },
  resources: { active: resourcesActiveIcon, inactive: resourcesInactiveIcon },
  profile: { active: profileActiveIcon, inactive: profileInactiveIcon },
};

export const wolliShortcutIcons = {
  alerts: alertsIcon,
  arrival: arrivalIcon,
  chat: chatActiveIcon,
  chatInactive: chatInactiveIcon,
  checklist: checklistIcon,
  events: eventsIcon,
  games: gamesIcon,
  health: healthIcon,
  home: homeActiveIcon,
  info: infoIcon,
  jobs: jobsIcon,
  maps: mapsIcon,
  profile: profileActiveIcon,
  resources: resourcesActiveIcon,
  suburbs: suburbsIcon,
  toilet: toiletIcon,
  vibe: vibeActiveIcon,
};
