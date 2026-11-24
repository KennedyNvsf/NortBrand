import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  CodeXml,
  Cog,
  Mail,
  Menu,
  PanelLeft,
  Pencil,
  Share2,
  X,
  type LucideIcon,
} from "lucide-react";

/*
 * Figma 02 Components › Iconography (37:118): 24×24 grid, rounded 1.5–1.75 px stroke,
 * no fill. The Handoff maps the set to Lucide; this is the one place that mapping
 * lives, so content files can name an icon instead of importing Lucide directly.
 */
export const ICON_STROKE = 1.75;

export const icons = {
  "arrow-right": ArrowRight,
  check: Check,
  "chevron-down": ChevronDown,
  close: X,
  calendar: Calendar,
  mail: Mail,
  menu: Menu,
  layout: PanelLeft,
  code: CodeXml,
  pencil: Pencil,
  share: Share2,
  gear: Cog,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
