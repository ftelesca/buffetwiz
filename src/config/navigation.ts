export interface NavigationItem {
  label: string;
  path: string;
  icon?: LucideIcon;
}

export const navigationItems: NavigationItem[] = [

];

export const getNavigationItems = () => navigationItems;

export default navigationItems;
