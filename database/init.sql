-- ============================================================
-- 多模态反诈智能体助手 - PostgreSQL DDL (pgvector)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    nickname      VARCHAR(50)  DEFAULT '',
    role          VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user', 'guardian', 'admin')),
    profile_json  JSONB        DEFAULT '{}',
    -- 画像字段(也存在 profile_json 中，这里冗余出来方便查询)
    age           INTEGER,
    gender        VARCHAR(10)  DEFAULT 'other',
    role_type     VARCHAR(20)  DEFAULT 'adult',
    occupation    VARCHAR(50)  DEFAULT '',
    education     VARCHAR(50)  DEFAULT '',
    province      VARCHAR(30)  DEFAULT '',
    city          VARCHAR(30)  DEFAULT '',
    -- 风险评估
    risk_score    REAL         DEFAULT 0.0,
    total_detections INTEGER   DEFAULT 0,
    fraud_hits    INTEGER      DEFAULT 0,
    -- 状态
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username  ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_role_type ON users(role_type);

-- 监护人关系表
CREATE TABLE IF NOT EXISTS guardian_relations (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship    VARCHAR(30) DEFAULT '',
    is_primary      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_gr_user_id     ON guardian_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_gr_guardian_id  ON guardian_relations(guardian_id);

-- 诈骗知识库(含 pgvector 向量)
CREATE TABLE IF NOT EXISTS scam_knowledge_base (
    id            SERIAL PRIMARY KEY,
    doc_id        VARCHAR(100) UNIQUE NOT NULL,
    title         VARCHAR(300) NOT NULL,
    content       TEXT         NOT NULL,
    scam_type     VARCHAR(50)  DEFAULT '',
    category      VARCHAR(50)  DEFAULT '',
    source        VARCHAR(100) DEFAULT '',
    embedding     vector(1024),
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skb_scam_type ON scam_knowledge_base(scam_type);
CREATE INDEX IF NOT EXISTS idx_skb_category  ON scam_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_skb_doc_id    ON scam_knowledge_base(doc_id);
-- HNSW 向量索引 (用于高速近似最近邻检索)
CREATE INDEX IF NOT EXISTS idx_skb_embedding ON scam_knowledge_base
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 用户记忆日志
CREATE TABLE IF NOT EXISTS user_memory_logs (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    short_term_context  TEXT    DEFAULT '',
    long_term_summary   TEXT    DEFAULT '',
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uml_user_id ON user_memory_logs(user_id);

-- 对话记录表
CREATE TABLE IF NOT EXISTS conversations (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id      VARCHAR(50) NOT NULL,
    input_type      VARCHAR(20) DEFAULT 'text',
    input_content   TEXT        NOT NULL,
    input_file_path VARCHAR(500) DEFAULT '',
    -- 分析结果
    is_fraud        BOOLEAN     DEFAULT FALSE,
    fraud_type      VARCHAR(50),
    risk_level      VARCHAR(20) DEFAULT 'safe',
    risk_score      REAL        DEFAULT 0.0,
    analysis_result JSONB       DEFAULT '{}',
    matched_cases   JSONB       DEFAULT '[]',
    -- AI 响应
    ai_response     TEXT        DEFAULT '',
    response_time_ms INTEGER    DEFAULT 0,
    created_at      TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_user_id    ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conv_is_fraud   ON conversations(is_fraud);

-- 预警记录表
CREATE TABLE IF NOT EXISTS alert_records (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id   INTEGER REFERENCES conversations(id),
    alert_type        VARCHAR(20) NOT NULL,
    risk_level        INTEGER     NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 3),
    fraud_type        VARCHAR(50),
    trigger_modality  VARCHAR(50) DEFAULT 'text',
    title             VARCHAR(300) NOT NULL,
    description       TEXT         DEFAULT '',
    suggestion        TEXT         DEFAULT '',
    report_json       JSONB        DEFAULT '{}',
    screenshot_url    VARCHAR(500) DEFAULT '',
    -- 监护人
    guardian_notified BOOLEAN DEFAULT FALSE,
    guardian_response TEXT    DEFAULT '',
    -- 状态
    is_resolved       BOOLEAN   DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT NOW(),
    resolved_at       TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ar_user_id    ON alert_records(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_created_at ON alert_records(created_at);
CREATE INDEX IF NOT EXISTS idx_ar_risk_level ON alert_records(risk_level);
CREATE INDEX IF NOT EXISTS idx_ar_resolved   ON alert_records(is_resolved);

-- 安全报告表
CREATE TABLE IF NOT EXISTS reports (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(300) NOT NULL,
    report_type       VARCHAR(50)  DEFAULT 'weekly',
    period_start      TIMESTAMP    NOT NULL,
    period_end        TIMESTAMP    NOT NULL,
    total_detections  INTEGER      DEFAULT 0,
    fraud_detected    INTEGER      DEFAULT 0,
    risk_summary      JSONB        DEFAULT '{}',
    fraud_type_summary JSONB       DEFAULT '{}',
    suggestions       JSONB        DEFAULT '[]',
    content           TEXT         DEFAULT '',
    created_at        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- 诈骗统计表(可视化)
CREATE TABLE IF NOT EXISTS fraud_statistics (
    id              SERIAL PRIMARY KEY,
    date            DATE         NOT NULL,
    province        VARCHAR(30)  DEFAULT '',
    city            VARCHAR(30)  DEFAULT '',
    fraud_type      VARCHAR(50)  NOT NULL,
    case_count      INTEGER      DEFAULT 0,
    amount_involved REAL         DEFAULT 0.0,
    victim_age_avg  REAL         DEFAULT 0.0,
    victim_gender   VARCHAR(10)  DEFAULT '',
    created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs_date       ON fraud_statistics(date);
CREATE INDEX IF NOT EXISTS idx_fs_province   ON fraud_statistics(province);
CREATE INDEX IF NOT EXISTS idx_fs_fraud_type ON fraud_statistics(fraud_type);
