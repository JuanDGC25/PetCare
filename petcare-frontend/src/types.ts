export type Role = 'dueno' | 'proveedor';
export type Category = 'veterinaria' | 'peluqueria' | 'paseo' | 'guarderia';
export type Species = 'perro' | 'gato' | 'conejo' | 'otro';
export type Size = 'pequeno' | 'mediano' | 'grande';
export type BookingStatus = 'pendiente' | 'aceptada' | 'atendida' | 'rechazada' | 'cancelada';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  provider_id: number | null;
  business_name: string | null;
  category: Category | null;
}

export interface Pet {
  id: number;
  name: string;
  species: Species;
  breed: string | null;
  ageYears: number | null;
  weightKg: number | null;
  size: Size | null;
  notes: string | null;
}

export interface ClinicPet extends Pet {
  createdAt: string;
  editable: boolean;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  hasAccount: boolean;
  lastVisit: string | null;
  nextVisit: { date: string; service: string } | null;
  history: { service: string; date: string }[];
}

export interface Staff {
  id: number;
  name: string;
  specialty: string;
  active: boolean;
  total: number;
  attended: number;
  cancelled: number;
  upcoming: number;
  income: number;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  species: Species[];
  active?: boolean;
}

export interface AvailabilityBlock {
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ProviderSummary {
  id: number;
  businessName: string;
  category: Category;
  locality: string;
  neighborhood: string;
  description: string | null;
  minPrice: number;
  servicesCount: number;
  weekdays: number[];
}

export interface ProviderDetail extends Omit<ProviderSummary, 'minPrice' | 'servicesCount' | 'weekdays'> {
  address: string | null;
  phone: string | null;
  email: string;
  services: Service[];
  availability: AvailabilityBlock[];
}

export interface ProviderProfile {
  id: number;
  businessName: string;
  category: Category;
  locality: string;
  neighborhood: string;
  address: string | null;
  description: string | null;
}

export interface Booking {
  id: number;
  status: BookingStatus;
  urgent: boolean;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  ownerNotes: string | null;
  providerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  service: { id: number; name: string; durationMin: number };
  pet: { id: number; name: string; species: Species; breed: string | null; size: Size | null; notes: string | null };
  provider: {
    id: number; businessName: string; category: Category; neighborhood: string;
    address: string | null; phone: string | null;
  };
  owner: { id: number | null; name: string; phone: string | null; email: string | null };
  staff: { id: number; name: string; specialty: string } | null;
}

export interface Meta {
  categories: Category[];
  species: Species[];
  localities: string[];
}
