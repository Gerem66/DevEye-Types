import type { TCPUserType } from './User';
import type { FeaturesID } from './Feature';

export interface DBContextType {
  ID: number;
  Name: string;
  Logo: string;
  Features: string; // JSON string
  Password: string; // Hash
  ReAuthInterval: number | null; // Interval in seconds for re-authentication (null = never, 0 = always)
  Created: number;
}

export interface ContextType {
  id: number; // Context ID (0 = self)
  name: string;
  logo: string;
  users: TCPUserType[];
  features: FeaturesID[];
  reAuthInterval: number | null; // Interval in seconds for re-authentication (null = never, 0 = always)
  created: number;
}
