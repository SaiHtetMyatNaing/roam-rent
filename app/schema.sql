CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'customer', 'vehicle-owner', 'car-owner')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'suspended', 'pending')) NOT NULL DEFAULT 'pending',
  avatar_url TEXT,
  bio TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year > 1880),
  type TEXT CHECK (type IN ('Car', 'SUV', 'Motorbike', 'Van', 'Luxury')) NOT NULL,
  license_plate TEXT UNIQUE NOT NULL,
  color TEXT,
  seating_capacity INTEGER CHECK (seating_capacity > 0),
  drivetrain TEXT CHECK (drivetrain IN ('FWD', 'RWD', 'AWD', '4WD')),
  fuel_type TEXT CHECK (fuel_type IN ('Petrol', 'Diesel', 'Electric', 'Hybrid')),
  top_speed_mph INTEGER CHECK (top_speed_mph > 0),
  range_efficiency TEXT,
  description TEXT,
  price_per_day DECIMAL(10,2) NOT NULL CHECK (price_per_day > 0),
  location_city TEXT,
  location_state TEXT,
  status TEXT CHECK (status IN ('available', 'rented', 'maintenance', 'pending_approval', 'rejected')) NOT NULL DEFAULT 'pending_approval',
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);

CREATE TABLE vehicle_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);
CREATE INDEX idx_vehicle_images_is_primary ON vehicle_images(is_primary);

CREATE TABLE vehicle_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE INDEX idx_vehicle_features_vehicle_id ON vehicle_features(vehicle_id);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  pickup_date TIMESTAMPTZ NOT NULL,
  dropoff_date TIMESTAMPTZ NOT NULL CHECK (dropoff_date > pickup_date),
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  status TEXT CHECK (status IN ('pending', 'upcoming', 'ongoing', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resolved_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) NOT NULL DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'pending', 'resolved')) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_vehicle_id ON reviews(vehicle_id);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE identity_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT CHECK (document_type IN ('driver_license', 'passport', 'id_card')) NOT NULL,
  document_url TEXT,
  status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_identity_verifications_user_id ON identity_verifications(user_id);
CREATE INDEX idx_identity_verifications_status ON identity_verifications(status);

CREATE TABLE vehicle_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  available_from DATE NOT NULL,
  available_to DATE NOT NULL CHECK (available_to >= available_from),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_availability_vehicle_id ON vehicle_availability(vehicle_id);
CREATE INDEX idx_vehicle_availability_range ON vehicle_availability(available_from, available_to);

CREATE TABLE vehicle_blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT idx_vehicle_blocked_dates_unique UNIQUE (vehicle_id, blocked_date)
);

CREATE INDEX idx_vehicle_blocked_dates_vehicle_id ON vehicle_blocked_dates(vehicle_id);
CREATE INDEX idx_vehicle_blocked_dates_date ON vehicle_blocked_dates(blocked_date);

CREATE TABLE vehicle_taken_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL CHECK (to_date >= from_date),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_taken_periods_vehicle_id ON vehicle_taken_periods(vehicle_id);
CREATE INDEX idx_vehicle_taken_periods_range ON vehicle_taken_periods(from_date, to_date);
