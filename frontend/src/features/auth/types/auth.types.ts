export type BolivianpetsApiRole = "admin" | "merchant";

export type BolivianpetsUserResponse = {
  id: string;
  fullName: string;
  email: string;
  role: BolivianpetsApiRole;
  country: string;
  walletAddress: string | null;
  isVerified?: boolean;
  isActive?: boolean;
};

export type LoginRegisterResponse = {
  user: BolivianpetsUserResponse;
  token: string;
};

export type AuthModalMode = "sign-in" | "sign-up";
