import {
  BookOpen, BriefcaseBusiness, Car, Film, HeartPulse, House,
  MoreHorizontal, ShoppingBag, Tag, TrendingUp, Utensils, Wallet
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  tag: Tag,
  food: Utensils,
  utensils: Utensils,
  car: Car,
  house: House,
  home: House,
  heart: HeartPulse,
  'heart-pulse': HeartPulse,
  study: BookOpen,
  book: BookOpen,
  work: BriefcaseBusiness,
  wallet: Wallet,
  film: Film,
  'shopping-bag': ShoppingBag,
  'more-horizontal': MoreHorizontal,
  'trending-up': TrendingUp
};

export function CategoryIcon({ icon, type, size = 14 }: {
  icon: string | null;
  type: 'expense' | 'income';
  size?: number;
}) {
  const Icon = (icon && icons[icon]) || (type === 'income' ? Wallet : Tag);
  return <Icon size={size} aria-hidden='true' />;
}
