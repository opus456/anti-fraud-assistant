"""
Pydantic 数据模式
"""
from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Any


# ==================== 用户 ====================

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    nickname: str = ""
    role: str = "user"  # user / guardian / admin
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: str = "other"
    role_type: str = "adult"
    occupation: str = ""
    education: str = ""
    province: str = ""
    city: str = ""


class UserLogin(BaseModel):
    username: str
    password: str


class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    nickname: str
    role: str
    age: Optional[int]
    gender: str
    role_type: str
    occupation: str
    education: str
    province: str
    city: str
    risk_score: float
    total_detections: int
    fraud_hits: int
    created_at: datetime
    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    role_type: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


# ==================== 监护人 ====================

class GuardianBind(BaseModel):
    guardian_username: str
    relationship: str = ""
    is_primary: bool = False


class GuardianRelationResponse(BaseModel):
    id: int
    guardian_id: int
    guardian_username: str
    guardian_nickname: str
    relationship: str
    is_primary: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ==================== 检测 ====================

class TextDetectionRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    context: str = ""


class MultimodalDetectionRequest(BaseModel):
    text: str = Field(default="", max_length=10000)
    image_ocr: str = Field(default="", max_length=10000)
    image_frame: str = Field(default="", max_length=10000000)  # 增加到 10MB 以支持大图片
    audio_transcript: str = Field(default="", max_length=10000)
    video_description: str = Field(default="", max_length=10000)
    context: str = Field(default="", max_length=2000)


class DetectionResult(BaseModel):
    is_fraud: bool
    risk_level: str
    risk_score: float = Field(ge=0.0, le=1.0)
    fraud_type: Optional[str] = None
    fraud_type_label: str = ""
    analysis: str = ""
    cot_reasoning: Optional[dict] = None  # CoT 思维链详情
    matched_cases: list[dict] = []
    suggestions: list[str] = []
    warning_scripts: list[str] = []
    response_time_ms: int = 0
    alert_actions: list[str] = []
    pipeline: Optional[dict] = None


class ConversationResponse(BaseModel):
    id: int
    input_type: str
    input_content: str
    is_fraud: bool
    fraud_type: Optional[str]
    risk_level: str
    risk_score: float
    analysis_result: Optional[dict] = None  # 包含 analysis, cot_reasoning, suggestions 等
    ai_response: str
    response_time_ms: int
    created_at: datetime
    
    model_config = {
        "from_attributes": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat() + 'Z' if v else None
        }
    }


# ==================== 预警 ====================

class AlertResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    nickname: Optional[str] = None
    conversation_id: Optional[int] = None
    alert_type: str
    risk_level: int
    fraud_type: Optional[str]
    title: str
    description: str
    suggestion: str
    report_json: Optional[dict] = None
    guardian_notified: bool
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolver_name: Optional[str] = None
    resolve_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    
    model_config = {
        "from_attributes": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat() + 'Z' if v else None
        }
    }


# ==================== 报告 ====================

class ReportRequest(BaseModel):
    report_type: str = "weekly"
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ReportResponse(BaseModel):
    id: int
    title: str
    report_type: str
    period_start: datetime
    period_end: datetime
    total_detections: int
    fraud_detected: int
    risk_summary: Any
    fraud_type_summary: Any
    suggestions: Any
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ==================== 知识库 ====================

class KnowledgeQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)
    category: Optional[str] = None


class KnowledgeResult(BaseModel):
    id: str
    title: str
    content: str
    category: str
    source: str
    scam_type: str = ""
    similarity: Optional[float] = None


class KnowledgeAddRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1)
    category: str = ""
    source: str = ""
    scam_type: str = ""


# ==================== 进化 ====================

class EvolveRequest(BaseModel):
    """管理员提交新型诈骗数据"""
    title: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1)
    scam_type: str = ""
    source: str = "admin_review"


# ==================== 统计 ====================

class StatisticsOverview(BaseModel):
    total_users: int
    total_detections: int
    total_fraud_detected: int = 0
    total_alerts: int = 0
    detection_accuracy: float = 0.946
    avg_response_time_ms: float = 320.5
    # Dashboard 用
    fraud_detected: int = 0
    alerts_pending: int = 0
    alerts_resolved: int = 0
    today_detections: int = 0
    today_fraud: int = 0
    detection_rate: float = 0.0
    guard_count: int = 0


# ==================== 通用 ====================

class MessageResponse(BaseModel):
    message: str
    success: bool = True
