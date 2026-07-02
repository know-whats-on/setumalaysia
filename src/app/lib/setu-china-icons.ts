import alertsIcon from '../../assets/setu-china-icons/alerts.png';
import arrivalIcon from '../../assets/setu-china-icons/arrival.png';
import chatActiveIcon from '../../assets/setu-china-icons/chat-active.png';
import chatInactiveIcon from '../../assets/setu-china-icons/chat-inactive.png';
import eventsIcon from '../../assets/setu-china-icons/events.png';
import gamesPandaIcon from '../../assets/setu-china-games-panda.png';
import healthIcon from '../../assets/setu-china-icons/health.png';
import homeActiveIcon from '../../assets/setu-china-icons/home-active.png';
import homeInactiveIcon from '../../assets/setu-china-icons/home-inactive.png';
import infoIcon from '../../assets/setu-china-icons/info.png';
import jobsIcon from '../../assets/setu-china-icons/jobs.png';
import mapsIcon from '../../assets/setu-china-icons/maps.png';
import profileActiveIcon from '../../assets/setu-china-icons/profile-active.png';
import profileInactiveIcon from '../../assets/setu-china-icons/profile-inactive.png';
import resourcesActiveIcon from '../../assets/setu-china-icons/resources-active.png';
import resourcesInactiveIcon from '../../assets/setu-china-icons/resources-inactive.png';
import suburbsIcon from '../../assets/setu-china-icons/suburbs.png';
import tfnIcon from '../../assets/setu-china-icons/tfn.png';
import toiletIcon from '../../assets/setu-china-icons/toilet.png';
import vibeActiveIcon from '../../assets/setu-china-icons/vibe-active.png';
import vibeInactiveIcon from '../../assets/setu-china-icons/vibe-inactive.png';
import type { View } from '../components/nav-bar';

export const setuChinaNavIcons: Partial<Record<View, { active: string; inactive: string }>> = {
  dashboard: { active: homeActiveIcon, inactive: homeInactiveIcon },
  vibe: { active: vibeActiveIcon, inactive: vibeInactiveIcon },
  arrival: { active: chatActiveIcon, inactive: chatInactiveIcon },
  resources: { active: resourcesActiveIcon, inactive: resourcesInactiveIcon },
  profile: { active: profileActiveIcon, inactive: profileInactiveIcon },
};

export const setuChinaShortcutIcons = {
  alerts: alertsIcon,
  arrival: arrivalIcon,
  chat: chatActiveIcon,
  chatInactive: chatInactiveIcon,
  events: eventsIcon,
  games: gamesPandaIcon,
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
