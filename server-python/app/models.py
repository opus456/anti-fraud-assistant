"""
反诈智能体助手 - ORM 数据模型 (PostgreSQL)
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime,
    Boolean, ForeignKey, Index, text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nickname = Column(String(50), default="")
    role = Column(String(20), default="user")  # user / guardian / admin
    profile_json = Column(JSONB, default=dict)

    age = Column(Integer, nullable=True)
    gender = Column(String(10), default="other")
    role_type = Column(String(20), default="adult")
    occupation = Column(String(50), default="")
    education = Column(String(50), default="")
    province = Column(String(30), default="")
    city = Column(String(30), default="")

    risk_score = Column(Float, default=0.0)
    total_detections = Column(Integer, default=0)
    fraud_hits = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    guardian_of = relationship(
        "GuardianRelation", foreign_keys="GuardianRelation.user_id",
        back_populates="user", cascade="all, delete-orphan"
    )
    guarding = relationship(
        "GuardianRelation", foreign_keys="GuardianRelation.guardian_id",
        back_populates="guardian", cascade="all, delete-orphan"
    )
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship(
        "AlertRecord", foreign_keys="AlertRecord.user_id",
        back_populates="user", cascade="all, delete-orphan"
    )
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    memory_logs = relationship("UserMemoryLog", back_populates="user", cascade="all, delete-orphan")


class GuardianRelation(Base):
    __tablename__ = "guardian_relations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    guardian_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column("relationship", String(30), default="")
    is_primary = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], back_populates="guardian_of")
    guardian = relationship("User", foreign_keys=[guardian_id], back_populates="guarding")


class ScamKnowledge(Base):
    __tablename__ = "scam_knowledge_base"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_id = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    scam_type = Column(String(50), default="", index=True)
    category = Column(String(50), default="", index=True)
    source = Column(String(100), default="")
    embedding = Column(Vector(1024), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserMemoryLog(Base):
    __tablename__ = "user_memory_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    short_term_context = Column(Text, default="")
    long_term_summary = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="memory_logs")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(50), nullable=False, index=True)
    input_type = Column(String(20), default="text")
    input_content = Column(Text, nullable=False)
    input_file_path = Column(String(500), default="")

    is_fraud = Column(Boolean, default=False)
    fraud_type = Column(String(50), nullable=True)
    risk_level = Column(String(20), default="safe")
    risk_score = Column(Float, default=0.0)
    analysis_result = Column(JSONB, default=dict)
    matched_cases = Column(JSONB, default=list)

    ai_response = Column(Text, default="")
    response_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")


class AlertRecord(Base):
    __tablename__ = "alert_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)

    alert_type = Column(String(20), nullable=False)
    risk_level = Column(Integer, nullable=False, default=0)
    fraud_type = Column(String(50), nullable=True)
    trigger_modality = Column(String(50), default="text")

    title = Column(String(300), nullable=False)
    description = Column(Text, default="")
    suggestion = Column(Text, default="")
    report_json = Column(JSONB, default=dict)
    screenshot_url = Column(String(500), default="")

    guardian_notified = Column(Boolean, default=False)
    guardian_response = Column(Text, default="")

    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 处理人ID
    resolve_note = Column(Text, default="")  # 处理备注
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="alerts")
    resolver = relationship("User", foreign_keys=[resolved_by])


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(300), nullable=False)
    report_type = Column(String(50), default="weekly")
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    total_detections = Column(Integer, default=0)
    fraud_detected = Column(Integer, default=0)
    risk_summary = Column(JSONB, default=dict)
    fraud_type_summary = Column(JSONB, default=dict)
    suggestions = Column(JSONB, default=list)
    content = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")


class FraudStatistic(Base):
    __tablename__ = "fraud_statistics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, nullable=False, index=True)
    province = Column(String(30), default="")
    city = Column(String(30), default="")
    fraud_type = Column(String(50), nullable=False)
    case_count = Column(Integer, default=0)
    amount_involved = Column(Float, default=0.0)
    victim_age_avg = Column(Float, default=0.0)
    victim_gender = Column(String(10), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
