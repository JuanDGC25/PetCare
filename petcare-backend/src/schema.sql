CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  password_hash   VARCHAR(100) NOT NULL,
  document        VARCHAR(20),
  phone           VARCHAR(30),
  role            VARCHAR(20)  NOT NULL CHECK (role IN ('dueno', 'proveedor')),
  data_consent_at TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name  VARCHAR(140) NOT NULL,
  category       VARCHAR(20)  NOT NULL CHECK (category IN ('veterinaria', 'peluqueria', 'paseo', 'guarderia')),
  locality       VARCHAR(60)  NOT NULL,
  neighborhood   VARCHAR(80)  NOT NULL,
  address        VARCHAR(160),
  description    TEXT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id           SERIAL PRIMARY KEY,
  provider_id  INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name         VARCHAR(120) NOT NULL,
  specialty    VARCHAR(80)  NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pets (
  id           SERIAL PRIMARY KEY,
  owner_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  provider_id  INTEGER REFERENCES providers(id) ON DELETE CASCADE,
  owner_name   VARCHAR(120),
  owner_phone  VARCHAR(30),
  name         VARCHAR(60) NOT NULL,
  species      VARCHAR(20) NOT NULL CHECK (species IN ('perro', 'gato', 'conejo', 'otro')),
  breed        VARCHAR(60),
  age_years    NUMERIC(4,1) CHECK (age_years >= 0 AND age_years < 40),
  weight_kg    NUMERIC(5,1) CHECK (weight_kg > 0 AND weight_kg < 200),
  size         VARCHAR(20) CHECK (size IN ('pequeno', 'mediano', 'grande')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (owner_id IS NOT NULL OR (provider_id IS NOT NULL AND owner_name IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS services (
  id            SERIAL PRIMARY KEY,
  provider_id   INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  price         INTEGER NOT NULL CHECK (price >= 0),
  duration_min  INTEGER NOT NULL CHECK (duration_min BETWEEN 15 AND 600),
  species       TEXT[]  NOT NULL DEFAULT ARRAY['perro', 'gato'],
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability (
  id           SERIAL PRIMARY KEY,
  provider_id  INTEGER  NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  weekday      SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time   TIME     NOT NULL,
  end_time     TIME     NOT NULL,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pet_id         INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  service_id     INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  provider_id    INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id       INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  booking_date   DATE    NOT NULL,
  start_time     TIME    NOT NULL,
  end_time       TIME    NOT NULL,
  price          INTEGER NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                 CHECK (status IN ('pendiente', 'aceptada', 'atendida', 'rechazada', 'cancelada')),
  urgent         BOOLEAN NOT NULL DEFAULT FALSE,
  owner_notes    TEXT,
  provider_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pets_owner        ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pets_provider     ON pets(provider_id);
CREATE INDEX IF NOT EXISTS idx_staff_provider    ON staff(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_avail_provider    ON availability(provider_id, weekday);
CREATE INDEX IF NOT EXISTS idx_bookings_owner    ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_pet      ON bookings(pet_id);
