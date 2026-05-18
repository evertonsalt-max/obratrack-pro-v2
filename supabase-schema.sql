-- ============================================================
-- OBRATRACK PRO — Schema completo para o Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- ── 1. EXTENSÕES ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. TABELA DE EMPRESAS (multi-tenant futuro) ─────────────
CREATE TABLE IF NOT EXISTS companies (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(100) UNIQUE,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plano       VARCHAR(20) DEFAULT 'free' CHECK (plano IN ('free','basic','pro','enterprise')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. PERFIS DE USUÁRIO ────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  nome        VARCHAR(200),
  avatar_url  TEXT,
  role        VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('owner','admin','operator','viewer')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. FUNCIONÁRIOS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  nome        VARCHAR(200) NOT NULL,
  apelido     VARCHAR(100),
  telefone    VARCHAR(30),
  funcao      VARCHAR(100),
  diaria      DECIMAL(10,2) DEFAULT 0,
  status      VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  admissao    DATE,
  obs         TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. OBRAS / LOCAIS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS worksites (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  nome        VARCHAR(200) NOT NULL,
  endereco    TEXT,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. REGISTROS DE JORNADA ─────────────────────────────────
CREATE TABLE IF NOT EXISTS work_logs (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  employee_name VARCHAR(100),
  data          DATE NOT NULL,
  local         VARCHAR(200),
  jornada       VARCHAR(20) DEFAULT 'DIA_INTEIRO'
                  CHECK (jornada IN ('DIA_INTEIRO','MEIO_TURNO','OUTRO')),
  entrada       TIME,
  saida         TIME,
  horas         DECIMAL(4,1) DEFAULT 0,
  diaria        DECIMAL(10,2) DEFAULT 0,
  vale          BOOLEAN DEFAULT false,
  valor_vale    DECIMAL(10,2) DEFAULT 0,
  obs           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. PAGAMENTOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  employee_name VARCHAR(100),
  data          DATE NOT NULL,
  valor         DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  tipo          VARCHAR(30) DEFAULT 'Semanal'
                  CHECK (tipo IN ('Semanal','Quinzenal','Mensal','Adiantamento','Acerto Final')),
  obs           TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. LOGS DE AUDITORIA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,
  table_name  VARCHAR(50),
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. HISTÓRICO DE IMPORTAÇÕES ─────────────────────────────
CREATE TABLE IF NOT EXISTS import_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  tipo            VARCHAR(30) CHECK (tipo IN ('funcionarios','registros','pagamentos')),
  arquivo         VARCHAR(200),
  total_linhas    INT DEFAULT 0,
  linhas_ok       INT DEFAULT 0,
  linhas_erro     INT DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'concluido',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. ÍNDICES PARA PERFORMANCE ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_user    ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user    ON work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_date    ON work_logs(data);
CREATE INDEX IF NOT EXISTS idx_work_logs_emp     ON work_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_user     ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_emp      ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_user        ON audit_logs(user_id);

-- ── 11. ROW LEVEL SECURITY (RLS) ────────────────────────────
-- Cada usuário vê APENAS seus próprios dados

ALTER TABLE companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Usuário vê só seu perfil"
  ON profiles FOR ALL USING (auth.uid() = id);

-- Policies para employees
CREATE POLICY "Usuário gerencia seus funcionários"
  ON employees FOR ALL USING (auth.uid() = user_id);

-- Policies para worksites
CREATE POLICY "Usuário gerencia suas obras"
  ON worksites FOR ALL USING (auth.uid() = user_id);

-- Policies para work_logs
CREATE POLICY "Usuário gerencia seus registros"
  ON work_logs FOR ALL USING (auth.uid() = user_id);

-- Policies para payments
CREATE POLICY "Usuário gerencia seus pagamentos"
  ON payments FOR ALL USING (auth.uid() = user_id);

-- Policies para audit_logs (só leitura)
CREATE POLICY "Usuário vê seus logs"
  ON audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Policies para import_logs
CREATE POLICY "Usuário vê seus imports"
  ON import_logs FOR ALL USING (auth.uid() = user_id);

-- ── 12. TRIGGER: criar perfil ao cadastrar ──────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 13. TRIGGER: updated_at automático ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_work_logs_updated
  BEFORE UPDATE ON work_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
