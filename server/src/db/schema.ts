export const SCHEMA = `
CREATE TABLE IF NOT EXISTS bank_key (
  type TEXT PRIMARY KEY,
  public_key_pem TEXT NOT NULL,
  private_key_pem TEXT NOT NULL,
  digest TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS participant (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  ini_state TEXT NOT NULL DEFAULT 'NEW',
  hia_state TEXT NOT NULL DEFAULT 'NEW',
  hpb_state TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  UNIQUE (host_id, partner_id, user_id)
);

CREATE TABLE IF NOT EXISTS participant_key (
  participant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  public_key_pem TEXT NOT NULL,
  digest TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (participant_id, type),
  FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  iban TEXT NOT NULL,
  bic TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'EUR',
  name TEXT NOT NULL DEFAULT '',
  balance TEXT NOT NULL DEFAULT '0.00'
);

CREATE TABLE IF NOT EXISTS participant_account (
  participant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  PRIMARY KEY (participant_id, account_id),
  FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  book_date TEXT NOT NULL,
  value_date TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  credit_debit TEXT NOT NULL,
  remittance TEXT NOT NULL DEFAULT '',
  counterparty_name TEXT NOT NULL DEFAULT '',
  counterparty_iban TEXT NOT NULL DEFAULT '',
  statement_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS upload_order (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT '',
  msg_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  signature_valid INTEGER,
  item_count INTEGER NOT NULL DEFAULT 0,
  total_amount TEXT NOT NULL DEFAULT '0.00',
  currency TEXT NOT NULL DEFAULT 'EUR',
  raw_pain TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_item (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  iban TEXT NOT NULL DEFAULT '',
  amount TEXT NOT NULL DEFAULT '0.00',
  currency TEXT NOT NULL DEFAULT 'EUR',
  remittance TEXT NOT NULL DEFAULT '',
  end_to_end_id TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (order_id) REFERENCES upload_order(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS statement (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  iban TEXT NOT NULL,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS protocol (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  order_type TEXT NOT NULL,
  order_id TEXT,
  return_code TEXT NOT NULL,
  reason_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchange (
  id TEXT PRIMARY KEY,
  participant_id TEXT,
  root_element TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT '',
  transaction_id TEXT,
  phase TEXT NOT NULL DEFAULT '',
  return_code TEXT,
  request_xml TEXT NOT NULL,
  response_xml TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS veu_order (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  total_amount TEXT NOT NULL DEFAULT '0.00',
  currency TEXT NOT NULL DEFAULT 'EUR',
  signatures_done INTEGER NOT NULL DEFAULT 1,
  signatures_required INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_state (
  transaction_id TEXT PRIMARY KEY,
  participant_id TEXT,
  order_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  segments_total INTEGER NOT NULL DEFAULT 1,
  segments_done INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`
