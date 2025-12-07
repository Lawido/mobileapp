// types/index.ts
export interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

export interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export interface HeaderProps {
  title: string;
  showBack?: boolean;
  showCart?: boolean;
  showSearch?: boolean;
  onSearchPress?: () => void;
}

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
}