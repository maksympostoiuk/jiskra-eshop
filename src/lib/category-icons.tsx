import {
  Activity,
  BatteryCharging,
  Cable,
  Camera,
  Cast,
  Cpu,
  Gamepad2,
  HardDrive,
  Headphones,
  House,
  Joystick,
  Keyboard,
  Laptop,
  Lightbulb,
  Monitor,
  Mouse,
  Package,
  Plug,
  Printer,
  Router,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  Watch,
  type LucideIcon,
} from "lucide-react";

/** Icons selectable for categories in the CMS (stored by name). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
  tv: Tv,
  cast: Cast,
  headphones: Headphones,
  speaker: Speaker,
  watch: Watch,
  activity: Activity,
  "gamepad-2": Gamepad2,
  joystick: Joystick,
  cpu: Cpu,
  "hard-drive": HardDrive,
  cable: Cable,
  "battery-charging": BatteryCharging,
  keyboard: Keyboard,
  mouse: Mouse,
  camera: Camera,
  house: House,
  plug: Plug,
  printer: Printer,
  router: Router,
  lightbulb: Lightbulb,
  package: Package,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Package;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.6} />;
}
