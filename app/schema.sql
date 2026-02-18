-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Vehicles table
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

-- Vehicle images table
CREATE TABLE vehicle_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle features table
CREATE TABLE vehicle_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Bookings table
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

-- Disputes table
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

-- Reviews table
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

-- Identity verifications table
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

-- Vehicle availability table
CREATE TABLE vehicle_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  available_from DATE NOT NULL,
  available_to DATE NOT NULL CHECK (available_to >= available_from),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle blocked dates table
CREATE TABLE vehicle_blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT idx_vehicle_blocked_dates_unique UNIQUE (vehicle_id, blocked_date)
);

-- Vehicle taken periods table
CREATE TABLE vehicle_taken_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL CHECK (to_date >= from_date),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Vehicles indexes
CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);

-- Vehicle images indexes
CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);
CREATE INDEX idx_vehicle_images_is_primary ON vehicle_images(is_primary);

-- Vehicle features indexes
CREATE INDEX idx_vehicle_features_vehicle_id ON vehicle_features(vehicle_id);

-- Bookings indexes
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Disputes indexes
CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- Reviews indexes
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_vehicle_id ON reviews(vehicle_id);

-- Identity verifications indexes
CREATE INDEX idx_identity_verifications_user_id ON identity_verifications(user_id);
CREATE INDEX idx_identity_verifications_status ON identity_verifications(status);

-- Vehicle availability indexes
CREATE INDEX idx_vehicle_availability_vehicle_id ON vehicle_availability(vehicle_id);
CREATE INDEX idx_vehicle_availability_range ON vehicle_availability(available_from, available_to);

-- Vehicle blocked dates indexes
CREATE INDEX idx_vehicle_blocked_dates_vehicle_id ON vehicle_blocked_dates(vehicle_id);
CREATE INDEX idx_vehicle_blocked_dates_date ON vehicle_blocked_dates(blocked_date);

-- Vehicle taken periods indexes
CREATE INDEX idx_vehicle_taken_periods_vehicle_id ON vehicle_taken_periods(vehicle_id);
CREATE INDEX idx_vehicle_taken_periods_range ON vehicle_taken_periods(from_date, to_date);

-- Users insert
INSERT INTO users (
  first_name, last_name, email, phone, password_hash, role, status,
  avatar_url, bio, address_street, address_city, address_state, address_zip, address_country
) VALUES (
  :first_name, :last_name, :email, :phone, :password_hash, :role, :status,
  :avatar_url, :bio, :address_street, :address_city, :address_state, :address_zip, :address_country
);

-- Users select with filters
SELECT * FROM users
WHERE (:role IS NULL OR role = :role)
  AND (:status IS NULL OR status = :status)
  AND (:email IS NULL OR email = :email)
  AND (:search IS NULL OR (first_name ILIKE '%' || :search || '%' OR last_name ILIKE '%' || :search || '%'));

SELECT * FROM users
WHERE id = :id
  AND (:role IS NULL OR role = :role)
  AND (:status IS NULL OR status = :status)
  AND (:email IS NULL OR email = :email)
  AND (:search IS NULL OR (first_name ILIKE '%' || :search || '%' OR last_name ILIKE '%' || :search || '%'));

-- Users delete
DELETE FROM users WHERE id = :id;

-- Vehicles insert
INSERT INTO vehicles (
  owner_id, make, model, year, type, license_plate, color, seating_capacity,
  drivetrain, fuel_type, top_speed_mph, range_efficiency, description,
  price_per_day, location_city, location_state, status, approved_by
) VALUES (
  :owner_id, :make, :model, :year, :type, :license_plate, :color, :seating_capacity,
  :drivetrain, :fuel_type, :top_speed_mph, :range_efficiency, :description,
  :price_per_day, :location_city, :location_state, :status, :approved_by
);

-- Vehicles select with filters
SELECT * FROM vehicles
WHERE (:owner_id IS NULL OR owner_id = :owner_id)
  AND (:status IS NULL OR status = :status)
  AND (:type IS NULL OR type = :type)
  AND (:location_city IS NULL OR location_city ILIKE '%' || :location_city || '%')
  AND (:location_state IS NULL OR location_state ILIKE '%' || :location_state || '%')
  AND (:min_price IS NULL OR price_per_day >= :min_price)
  AND (:max_price IS NULL OR price_per_day <= :max_price)
  AND (:min_seats IS NULL OR seating_capacity >= :min_seats)
  AND (:fuel_type IS NULL OR fuel_type = :fuel_type)
  AND (:drivetrain IS NULL OR drivetrain = :drivetrain);

SELECT * FROM vehicles
WHERE id = :id
  AND (:owner_id IS NULL OR owner_id = :owner_id)
  AND (:status IS NULL OR status = :status)
  AND (:type IS NULL OR type = :type)
  AND (:location_city IS NULL OR location_city ILIKE '%' || :location_city || '%')
  AND (:location_state IS NULL OR location_state ILIKE '%' || :location_state || '%')
  AND (:min_price IS NULL OR price_per_day >= :min_price)
  AND (:max_price IS NULL OR price_per_day <= :max_price)
  AND (:min_seats IS NULL OR seating_capacity >= :min_seats)
  AND (:fuel_type IS NULL OR fuel_type = :fuel_type)
  AND (:drivetrain IS NULL OR drivetrain = :drivetrain);

-- Vehicles delete
DELETE FROM vehicles WHERE id = :id;

-- Vehicle images insert
INSERT INTO vehicle_images (vehicle_id, url, is_primary)
VALUES (:vehicle_id, :url, :is_primary);

-- Vehicle images select with filters
SELECT * FROM vehicle_images
WHERE (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:is_primary IS NULL OR is_primary = :is_primary);

SELECT * FROM vehicle_images
WHERE id = :id
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:is_primary IS NULL OR is_primary = :is_primary);

-- Vehicle images delete
DELETE FROM vehicle_images WHERE id = :id;

-- Vehicle features insert
INSERT INTO vehicle_features (vehicle_id, name)
VALUES (:vehicle_id, :name);

-- Vehicle features select with filters
SELECT * FROM vehicle_features
WHERE (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:name IS NULL OR name ILIKE '%' || :name || '%');

SELECT * FROM vehicle_features
WHERE id = :id
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:name IS NULL OR name ILIKE '%' || :name || '%');

-- Vehicle features delete
DELETE FROM vehicle_features WHERE id = :id;

-- Bookings insert
INSERT INTO bookings (
  customer_id, vehicle_id, pickup_date, dropoff_date,
  pickup_location, dropoff_location, total_price, status
) VALUES (
  :customer_id, :vehicle_id, :pickup_date, :dropoff_date,
  :pickup_location, :dropoff_location, :total_price, :status
);

-- Bookings select with filters
SELECT * FROM bookings
WHERE (:customer_id IS NULL OR customer_id = :customer_id)
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:status IS NULL OR status = :status)
  AND (:from_date IS NULL OR pickup_date >= :from_date)
  AND (:to_date IS NULL OR dropoff_date <= :to_date);

SELECT * FROM bookings
WHERE id = :id
  AND (:customer_id IS NULL OR customer_id = :customer_id)
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:status IS NULL OR status = :status)
  AND (:from_date IS NULL OR pickup_date >= :from_date)
  AND (:to_date IS NULL OR dropoff_date <= :to_date);

-- Bookings delete
DELETE FROM bookings WHERE id = :id;

-- Disputes insert
INSERT INTO disputes (
  booking_id, submitted_by, resolved_by, title, description, priority, status, resolved_at
) VALUES (
  :booking_id, :submitted_by, :resolved_by, :title, :description, :priority, :status, :resolved_at
);

-- Disputes select with filters
SELECT * FROM disputes
WHERE (:booking_id IS NULL OR booking_id = :booking_id)
  AND (:submitted_by IS NULL OR submitted_by = :submitted_by)
  AND (:resolved_by IS NULL OR resolved_by = :resolved_by)
  AND (:priority IS NULL OR priority = :priority)
  AND (:status IS NULL OR status = :status);

SELECT * FROM disputes
WHERE id = :id
  AND (:booking_id IS NULL OR booking_id = :booking_id)
  AND (:submitted_by IS NULL OR submitted_by = :submitted_by)
  AND (:resolved_by IS NULL OR resolved_by = :resolved_by)
  AND (:priority IS NULL OR priority = :priority)
  AND (:status IS NULL OR status = :status);

-- Disputes delete
DELETE FROM disputes WHERE id = :id;

-- Reviews insert
INSERT INTO reviews (
  booking_id, reviewer_id, reviewee_id, vehicle_id, rating, comment
) VALUES (
  :booking_id, :reviewer_id, :reviewee_id, :vehicle_id, :rating, :comment
);

-- Reviews select with filters
SELECT * FROM reviews
WHERE (:booking_id IS NULL OR booking_id = :booking_id)
  AND (:reviewer_id IS NULL OR reviewer_id = :reviewer_id)
  AND (:reviewee_id IS NULL OR reviewee_id = :reviewee_id)
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:rating IS NULL OR rating = :rating);

SELECT * FROM reviews
WHERE id = :id
  AND (:booking_id IS NULL OR booking_id = :booking_id)
  AND (:reviewer_id IS NULL OR reviewer_id = :reviewer_id)
  AND (:reviewee_id IS NULL OR reviewee_id = :reviewee_id)
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:rating IS NULL OR rating = :rating);

-- Reviews delete
DELETE FROM reviews WHERE id = :id;

-- Identity verifications insert
INSERT INTO identity_verifications (
  user_id, document_type, document_url, status, verified_by, verified_at
) VALUES (
  :user_id, :document_type, :document_url, :status, :verified_by, :verified_at
);

-- Identity verifications select with filters
SELECT * FROM identity_verifications
WHERE (:user_id IS NULL OR user_id = :user_id)
  AND (:document_type IS NULL OR document_type = :document_type)
  AND (:status IS NULL OR status = :status);

SELECT * FROM identity_verifications
WHERE id = :id
  AND (:user_id IS NULL OR user_id = :user_id)
  AND (:document_type IS NULL OR document_type = :document_type)
  AND (:status IS NULL OR status = :status);

-- Identity verifications delete
DELETE FROM identity_verifications WHERE id = :id;

-- Vehicle availability insert
INSERT INTO vehicle_availability (
  vehicle_id, available_from, available_to, note
) VALUES (
  :vehicle_id, :available_from, :available_to, :note
);

-- Vehicle availability select with filters
SELECT * FROM vehicle_availability
WHERE (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:from_date IS NULL OR available_from >= :from_date)
  AND (:to_date IS NULL OR available_to <= :to_date);

SELECT * FROM vehicle_availability
WHERE id = :id
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:from_date IS NULL OR available_from >= :from_date)
  AND (:to_date IS NULL OR available_to <= :to_date);

-- Vehicle availability delete
DELETE FROM vehicle_availability WHERE id = :id;

-- Vehicle blocked dates insert
INSERT INTO vehicle_blocked_dates (
  vehicle_id, blocked_date, reason
) VALUES (
  :vehicle_id, :blocked_date, :reason
);

-- Vehicle blocked dates select with filters
SELECT * FROM vehicle_blocked_dates
WHERE (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:blocked_date IS NULL OR blocked_date = :blocked_date);

SELECT * FROM vehicle_blocked_dates
WHERE id = :id
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:blocked_date IS NULL OR blocked_date = :blocked_date);

-- Vehicle blocked dates delete
DELETE FROM vehicle_blocked_dates WHERE id = :id;

-- Vehicle taken periods insert
INSERT INTO vehicle_taken_periods (
  vehicle_id, from_date, to_date, reason
) VALUES (
  :vehicle_id, :from_date, :to_date, :reason
);

-- Vehicle taken periods select with filters
SELECT * FROM vehicle_taken_periods
WHERE (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:from_date IS NULL OR from_date >= :from_date)
  AND (:to_date IS NULL OR to_date <= :to_date);

SELECT * FROM vehicle_taken_periods
WHERE id = :id
  AND (:vehicle_id IS NULL OR vehicle_id = :vehicle_id)
  AND (:from_date IS NULL OR from_date >= :from_date)
  AND (:to_date IS NULL OR to_date <= :to_date);

-- Vehicle taken periods delete
DELETE FROM vehicle_taken_periods WHERE id = :id;
