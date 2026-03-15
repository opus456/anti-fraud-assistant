"""
反诈智能体助手 - 数据库模型
定义所有 SQLAlchemy ORM 模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime,
    Boolean, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


# ==================== 枚举定义 ====================

class UserRole(str, enum.Enum):
    """用户角色类型"""
    ELDER = "elder"          # 老年人
    CHILD = "child"          # 儿童/青少年
    ADULT = "adult"          # 青壮年
    STUDENT = "student"      # 学生
    FINANCE = "finance"      # 财会人员
    OTHER = "other"          # 其他


class Gender(str, enum.Enum):
    """性别"""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class RiskLevel(str, enum.Enum):
    """风险等级"""
    SAFE = "safe"            # 安全
    LOW = "low"              # 低风险
    MEDIUM = "medium"        # 中风险
    HIGH = "high"            # 高风险
    CRITICAL = "critical"    # 极高风险


class AlertType(str, enum.Enum):
    """预警类型"""
    POPUP = "popup"              # 弹窗提醒
    VOICE = "voice"              # 语音警告
    GUARDIAN_NOTIFY = "guardian"  # 通知监护人
    DEVICE_LOCK = "lock"         # 设备锁定


class FraudType(str, enum.Enum):
    """诈骗类型"""
    INVESTMENT = "investment"          # 投资理财诈骗
    IMPERSONATION = "impersonation"    # 冒充身份诈骗
    ROMANCE = "romance"                # 杀猪盘/婚恋诈骗
    TASK_SCAM = "task_scam"            # 刷单诈骗
    LOAN = "loan"                      # 贷款诈骗
    SHOPPING = "shopping"              # 购物诈骗
    PHISHING = "phishing"              # 钓鱼诈骗
    GAMING = "gaming"                  # 游戏诈骗
    TELECOM = "telecom"                # 电信诈骗
    AI_DEEPFAKE = "ai_deepfake"        # AI深度伪造诈骗
    RECRUITMENT = "recruitment"        # 招聘诈骗
    OTHER = "other"                    # 其他


# ==================== 数据模型 ====================

class User(Base):
    """用户表 - 存储用户基本信息和画像数据"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    nickname = Column(String(50), default="")

    # 用户画像字段
    age = Column(Integer, nullable=True)
    gender = Column(SAEnum(Gender), default=Gender.OTHER)
    role_type = Column(SAEnum(UserRole), default=UserRole.ADULT)
    occupation = Column(String(50), default="")
    education = Column(String(50), default="")
    province = Column(String(30), default="")  # 省份（用于地图可视化）
    city = Column(String(30), default="")

    # 风险评估
    risk_score = Column(Float, default=0.0)  # 累计风险分
    total_detections = Column(Integer, default=0)  # 总检测次数
    fraud_hits = Column(Integer, default=0)  # 检出诈骗次数

    # 状态
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    guardians = relationship("Guardian", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Guardian(Base):
    """监护人表 - 存储监护人联系方式"""
    __tablename__ = "guardians"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), default="")
    relationship_type = Column(String(30), default="")  # 亲属关系
    is_primary = Column(Boolean, default=False)  # 是否为主要监护人
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="guardians")


class Conversation(Base):
    """对话记录表 - 存储用户与智能体的交互历史"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(50), nullable=False, index=True)

    # 输入信息
    input_type = Column(String(20), default="text")  # text/audio/image/video
    input_content = Column(Text, nullable=False)
    input_file_path = Column(String(500), default="")

    # 分析结果
    is_fraud = Column(Boolean, default=False)
    fraud_type = Column(SAEnum(FraudType), nullable=True)
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.SAFE)
    risk_score = Column(Float, default=0.0)
    analysis_result = Column(Text, default="")  # LLM分析结果(JSON)
    matched_cases = Column(Text, default="")  # 匹配的案例ID列表(JSON)

    # AI 响应
    ai_response = Column(Text, default="")
    response_time_ms = Column(Integer, default=0)  # 响应时间(毫秒)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")


class Alert(Base):
    """预警记录表 - 存储所有预警事件"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)

    alert_type = Column(SAEnum(AlertType), nullable=False)
    risk_level = Column(SAEnum(RiskLevel), nullable=False)
    fraud_type = Column(SAEnum(FraudType), nullable=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    suggestion = Column(Text, default="")  # 防御建议

    # 监护人通知
    guardian_notified = Column(Boolean, default=False)
    guardian_response = Column(Text, default="")

    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="alerts")


class Report(Base):
    """安全监测报告表"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(200), nullable=False)
    report_type = Column(String(50), default="weekly")  # daily/weekly/monthly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # 报告统计数据(JSON)
    total_detections = Column(Integer, default=0)
    fraud_detected = Column(Integer, default=0)
    risk_summary = Column(Text, default="{}")  # 风险分布(JSON)
    fraud_type_summary = Column(Text, default="{}")  # 诈骗类型分布(JSON)
    suggestions = Column(Text, default="[]")  # 防御建议列表(JSON)

    content = Column(Text, default="")  # 完整报告内容(Markdown/HTML)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")


class FraudStatistic(Base):
    """诈骗统计数据表 - 用于可视化展示"""
    __tablename__ = "fraud_statistics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(DateTime, nullable=False, index=True)
    province = Column(String(30), default="")
    city = Column(String(30), default="")

    fraud_type = Column(SAEnum(FraudType), nullable=False)
    case_count = Column(Integer, default=0)
    amount_involved = Column(Float, default=0.0)  # 涉案金额(万元)
    victim_age_avg = Column(Float, default=0.0)
    victim_gender = Column(String(10), default="")

    created_at = Column(DateTime, default=datetime.utcnow)


class KnowledgeEntry(Base):
    """知识库条目 - 存储反诈知识全文"""
    __tablename__ = "knowledge_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_id = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # law/case/prevention/warning
    source = Column(String(100), default="")
    fraud_type = Column(String(50), default="", index=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
