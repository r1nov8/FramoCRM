-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  location VARCHAR(255)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company_id INTEGER REFERENCES companies(id)
);

-- Projects table (extended)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  opportunity_number VARCHAR(255) NOT NULL,
  order_number VARCHAR(255),
  stage VARCHAR(50) NOT NULL,
  value NUMERIC,
  currency VARCHAR(10) NOT NULL,
  hedge_currency VARCHAR(10),
  gross_margin_percent NUMERIC,
  closing_date DATE NOT NULL,
  sales_rep_id INTEGER REFERENCES team_members(id),
  shipyard_id INTEGER REFERENCES companies(id),
  vessel_owner_id INTEGER REFERENCES companies(id),
  design_company_id INTEGER REFERENCES companies(id),
  primary_contact_id INTEGER REFERENCES contacts(id),
  notes TEXT,
  number_of_vessels INTEGER,
  pumps_per_vessel INTEGER,
  price_per_vessel NUMERIC,
  vessel_size NUMERIC,
  vessel_size_unit VARCHAR(10),
  fuel_type VARCHAR(20)
);

-- Products table (linked to projects)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  capacity NUMERIC,
  head NUMERIC
);

-- Project files table (linked to projects)
CREATE TABLE IF NOT EXISTS project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  size INTEGER,
  content TEXT
);


-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  initials VARCHAR(10) NOT NULL,
  job_title VARCHAR(255) NOT NULL
);
