"""
反诈智能体助手 - Pydantic 数据模式
定义请求/响应的数据验证模型
"""
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from typing import Optional


# ==================== 用户相关 ====================

class UserRegister(BaseModel):
    """用户注册"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    nickname: str = ""
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: str = "other"
    role_type: str = "adult"
    occupation: str = ""
    education: str = ""
    province: str = ""
    city: str = ""


class UserLogin(BaseModel):
    """用户登录"""
    username: str
    password: str


class UserProfile(BaseModel):
    """用户画像信息"""
    id: int
    username: str
    email: str
    nickname: str
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
    """用户画像更新"""
    nickname: Optional[str] = None
    age: Optional[int] = Field(None, ge=1, le=120)
    gender: Optional[str] = None
    role_type: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None


class TokenResponse(BaseModel):
    """登录令牌响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


# ==================== 监护人相关 ====================

class GuardianCreate(BaseModel):
    """添加监护人"""
    name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=5, max_length=20)
    email: str = ""
    relationship_type: str = ""
    is_primary: bool = False


class GuardianResponse(BaseModel):
    """监护人信息响应"""
    id: int
    name: str
    phone: str
    email: str
    relationship_type: str
    is_primary: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== 检测相关 ====================

class TextDetectionRequest(BaseModel):
    """文本检测请求"""
    content: str = Field(..., min_length=1, max_length=10000)
    context: str = ""  # 上下文信息


class MultimodalDetectionRequest(BaseModel):
    """多模态检测请求"""
    text: str = Field(default="", max_length=10000)
    image_ocr: str = Field(default="", max_length=10000)
    audio_transcript: str = Field(default="", max_length=10000)
    video_description: str = Field(default="", max_length=10000)
    context: str = Field(default="", max_length=2000)


class DetectionResult(BaseModel):
    """检测结果"""
    is_fraud: bool
    risk_level: str  # safe/low/medium/high/critical
    risk_score: float = Field(ge=0.0, le=1.0)
    fraud_type: Optional[str] = None
    fraud_type_label: str = ""
    analysis: str = ""  # 分析说明
    matched_cases: list[dict] = []  # 匹配的相似案例
    suggestions: list[str] = []  # 防御建议
    warning_scripts: list[str] = []  # 预警话术
    response_time_ms: int = 0
    alert_actions: list[str] = []  # 触发的预警动作


class ConversationResponse(BaseModel):
    """对话记录响应"""
    id: int
    input_type: str
    input_content: str
    is_fraud: bool
    fraud_type: Optional[str]
    risk_level: str
    risk_score: float
    ai_response: str
    response_time_ms: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== 预警相关 ====================

class AlertResponse(BaseModel):
    """预警信息响应"""
    id: int
    alert_type: str
    risk_level: str
    fraud_type: Optional[str]
    title: str
    description: str
    suggestion: str
    guardian_notified: bool
    is_resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== 报告相关 ====================

class ReportRequest(BaseModel):
    """报告生成请求"""
    report_type: str = "weekly"  # daily/weekly/monthly
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ReportResponse(BaseModel):
    """报告响应"""
    id: int
    title: str
    report_type: str
    period_start: datetime
    period_end: datetime
    total_detections: int
    fraud_detected: int
    risk_summary: str
    fraud_type_summary: str
    suggestions: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ==================== 知识库相关 ====================

class KnowledgeQuery(BaseModel):
    """知识库查询"""
    query: str = Field(..., min_length=1, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)
    category: Optional[str] = None  # law/case/prevention/warning


class KnowledgeResult(BaseModel):
    """知识库查询结果"""
    id: str
    title: str
    content: str
    category: str
    source: str
    similarity: float


class KnowledgeAddRequest(BaseModel):
    """添加知识条目"""
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    category: str = Field(..., pattern="^(law|case|prevention|warning)$")
    source: str = ""
    fraud_type: str = ""


# ==================== 统计相关 ====================

class StatisticsOverview(BaseModel):
    """统计概览"""
    total_users: int
    total_detections: int
    total_fraud_detected: int
    total_alerts: int
    detection_accuracy: float
    avg_response_time_ms: float


class FraudTypeStats(BaseModel):
    """诈骗类型统计"""
    fraud_type: str
    label: str
    count: int
    percentage: float


class ProvinceStats(BaseModel):
    """省份诈骗统计（地图可视化）"""
    province: str
    case_count: int
    amount_involved: float


class TrendData(BaseModel):
    """趋势数据"""
    date: str
    total: int
    fraud: int
    safe: int


class AgeDistribution(BaseModel):
    """年龄分布"""
    age_group: str
    count: int
    percentage: float


class RiskDistribution(BaseModel):
    """风险分布"""
    risk_level: str
    label: str
    count: int


# ==================== 通用 ====================

class MessageResponse(BaseModel):
    """通用消息响应"""
    message: str
    success: bool = True
