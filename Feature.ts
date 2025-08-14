import type { UserType } from './User';
import type { ContextType } from './Context';

export type FeaturesID = 'dashboard' | 'profile' | 'password' | 'gamelife';

export interface FeatureProps {
  user: UserType;
  setUser: (user: UserType | null) => void;
  context: ContextType;
  feature: FeatureType;
  setContext: (context: ContextType) => void;
  setFeature: (feature: FeatureType) => void;
}

export interface FeatureType {
  id: FeaturesID;
  name: string;
  icon: string; // Icon type
  component: React.ComponentType<FeatureProps>;
}
