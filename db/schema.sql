-- ============================================================
--  NagrikVaani — MySQL Database Schema
--  File: db/schema.sql
--
--  HOW TO USE:
--  1. Open MySQL Workbench or phpMyAdmin
--  2. Run this entire file once to set up the database
--  3. Never run it again (it will skip existing tables safely)
-- ============================================================


-- ── Step 1: Create the database ─────────────────────────────────
CREATE DATABASE IF NOT EXISTS nagrikvaani
  CHARACTER SET utf8mb4        -- supports Hindi, Marathi characters
  COLLATE utf8mb4_unicode_ci;

USE nagrikvaani;


-- ── Step 2: COMPLAINTS table ─────────────────────────────────────
-- Main table. Every complaint filed by a citizen is stored here.

CREATE TABLE IF NOT EXISTS complaints (

  -- Primary key: auto-increments (1, 2, 3, ...)
  id               INT AUTO_INCREMENT PRIMARY KEY,

  -- Unique complaint ID shown to citizen e.g. NV-2026-04821
  complaint_id     VARCHAR(20)  NOT NULL UNIQUE,

  -- Citizen personal info
  citizen_name     VARCHAR(100) NOT NULL,
  phone            VARCHAR(15)  NOT NULL,
  email            VARCHAR(100) DEFAULT NULL,

  -- Complaint text
  original_text    TEXT         NOT NULL,   -- what citizen said (any language)
  translated_text  TEXT         DEFAULT NULL, -- English version after translation
  language         VARCHAR(10)  DEFAULT 'en-IN', -- en-IN, hi-IN, mr-IN

  -- Auto-detected category (from NLP)
  category         VARCHAR(50)  NOT NULL DEFAULT 'Other',
  category_icon    VARCHAR(10)  DEFAULT '📌',
  nlp_confidence   VARCHAR(10)  DEFAULT 'low', -- high / medium / low

  -- Location info
  state            VARCHAR(50)  DEFAULT NULL,
  district         VARCHAR(50)  DEFAULT NULL,
  location_address TEXT         DEFAULT NULL,

  -- Latitude and Longitude for heatmap (filled later or via geocoding)
  latitude         DECIMAL(10, 7) DEFAULT NULL,
  longitude        DECIMAL(10, 7) DEFAULT NULL,

  -- Priority and Status
  priority         ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  status           ENUM('open', 'in_progress', 'resolved', 'rejected') DEFAULT 'open',

  -- Duplicate detection flag
  is_duplicate     BOOLEAN      DEFAULT FALSE,
  duplicate_of     VARCHAR(20)  DEFAULT NULL, -- complaint_id of original

  -- Timestamps
  submitted_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at      DATETIME     DEFAULT NULL

);


-- ── Step 3: TIMELINE table ───────────────────────────────────────
-- Tracks every status update for a complaint (activity log)

CREATE TABLE IF NOT EXISTS complaint_timeline (

  id            INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id  VARCHAR(20)  NOT NULL,    -- links to complaints.complaint_id
  event_title   VARCHAR(100) NOT NULL,    -- e.g. "Complaint Registered"
  event_note    TEXT         DEFAULT NULL, -- e.g. "Routed to PWD Department"
  updated_by    VARCHAR(100) DEFAULT 'System', -- who made this update
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key: if complaint is deleted, delete its timeline too
  FOREIGN KEY (complaint_id)
    REFERENCES complaints(complaint_id)
    ON DELETE CASCADE

);


-- ── Step 4: OFFICERS table ───────────────────────────────────────
-- Government officers who handle complaints

CREATE TABLE IF NOT EXISTS officers (

  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  designation  VARCHAR(100) DEFAULT NULL,  -- e.g. "Junior Engineer (PWD)"
  department   VARCHAR(50)  NOT NULL,      -- matches category
  district     VARCHAR(50)  DEFAULT NULL,
  email        VARCHAR(100) DEFAULT NULL,
  phone        VARCHAR(15)  DEFAULT NULL,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP

);


-- ── Step 5: ASSIGNMENTS table ────────────────────────────────────
-- Links complaints to officers

CREATE TABLE IF NOT EXISTS complaint_assignments (

  id            INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id  VARCHAR(20) NOT NULL,
  officer_id    INT         NOT NULL,
  assigned_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
  remarks       TEXT        DEFAULT NULL,

  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  FOREIGN KEY (officer_id)   REFERENCES officers(id)             ON DELETE CASCADE

);


-- ── Step 6: Add INDEXES for faster queries ───────────────────────
-- Indexes speed up searches (like adding bookmarks to a book)

-- Fast lookup by complaint ID (used in tracking)
CREATE INDEX idx_complaint_id   ON complaints(complaint_id);

-- Fast lookup by category (used in dashboard & NLP)
CREATE INDEX idx_category       ON complaints(category);

-- Fast lookup by district (used in heatmap)
CREATE INDEX idx_district       ON complaints(district);

-- Fast lookup by status (used in admin dashboard)
CREATE INDEX idx_status         ON complaints(status);

-- Fast lookup by phone (used in duplicate detection)
CREATE INDEX idx_phone          ON complaints(phone);

-- Fast lookup by submission date (used in reports)
CREATE INDEX idx_submitted_at   ON complaints(submitted_at);

-- Composite index: category + district together (heatmap queries)
CREATE INDEX idx_cat_district   ON complaints(category, district);


-- ── Step 7: Insert sample officer data ──────────────────────────
INSERT INTO officers (name, designation, department, district) VALUES
  ('Suresh Mehta',   'Junior Engineer',        'Infrastructure', 'Pune'),
  ('Anita Desai',    'Health Inspector',        'Health',         'Mumbai'),
  ('Rajesh Patil',   'Electrical Supervisor',   'Electricity',    'Nagpur'),
  ('Sunita Rao',     'Water Supply Officer',    'Water',          'Nashik'),
  ('Vikram Joshi',   'Education Officer',       'Education',      'Thane'),
  ('Priya Nair',     'Transport Commissioner',  'Transport',      'Aurangabad');


-- ── Step 8: Insert sample complaint (for testing) ────────────────
INSERT INTO complaints (
  complaint_id, citizen_name, phone,
  original_text, translated_text, language,
  category, category_icon, nlp_confidence,
  state, district, location_address,
  latitude, longitude, priority, status
) VALUES (
  'NV-2026-00001', 'Ramesh Kumar', '9876543210',
  'There is a big pothole near Gandhi Nagar bus stop causing accidents.',
  'There is a big pothole near Gandhi Nagar bus stop causing accidents.',
  'en-IN',
  'Infrastructure', '🏗️', 'high',
  'Maharashtra', 'Pune', 'Gandhi Nagar Bus Stop, Ward 14',
  18.5204, 73.8567, 'High', 'open'
);

-- Insert timeline entry for the sample complaint
INSERT INTO complaint_timeline (complaint_id, event_title, event_note, updated_by)
VALUES ('NV-2026-00001', 'Complaint Registered',
        'Complaint submitted successfully. ID NV-2026-00001 generated.', 'System');


-- ── Verify everything was created ────────────────────────────────
SHOW TABLES;
SELECT * FROM complaints;
SELECT * FROM officers;