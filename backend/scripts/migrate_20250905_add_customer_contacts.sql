-- Add customer_contacts table
CREATE TABLE customer_contacts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_title TEXT,
    email TEXT,
    phone_number TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Optional: index for faster lookup by company
CREATE INDEX idx_customer_contacts_company_id ON customer_contacts(company_id);