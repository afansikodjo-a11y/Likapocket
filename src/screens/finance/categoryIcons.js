/**
 * Mappe les clés d'icône des catégories (financeCategories.js) vers les
 * composants lucide-react-native. Centralisé pour éviter la répétition.
 */
import {
  ShoppingCart, Bus, FileText, HeartPulse, GraduationCap,
  PartyPopper, ArrowLeftRight, PiggyBank, TrendingUp, Tag,
} from 'lucide-react-native';

export const CATEGORY_ICONS = {
  'shopping-cart':  ShoppingCart,
  'bus':            Bus,
  'file-text':      FileText,
  'heart-pulse':    HeartPulse,
  'graduation-cap': GraduationCap,
  'party-popper':   PartyPopper,
  'arrow-left-right': ArrowLeftRight,
  'piggy-bank':     PiggyBank,
  'trending-up':    TrendingUp,
  'tag':            Tag,
};

export function categoryIcon(key) {
  return CATEGORY_ICONS[key] ?? Tag;
}
