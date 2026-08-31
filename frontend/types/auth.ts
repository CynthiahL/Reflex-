export type UserRole =
  | "RETAILER"
  | "DISPATCHER"
  | "RIDER";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

export interface AuthResponse {
  message: string;
  user: UserProfile;
}