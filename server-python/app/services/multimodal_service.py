"""
多模态处理服务 - 支持文本、图片、音频的统一处理
提供本地Ollama多模态模型和远程API的双重支持
"""
from __future__ import annotations

import base64
import logging
import asyncio
from typing import Optional
from pathlib import Path

import httpx
from PIL import Image
import io

from app.config import settings

logger = logging.getLogger(__name__)


class MultimodalService:
    """多模态处理服务 - 图像理解、语音转文字"""
    
    def __init__(self):
        self.ollama_base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.vision_model = getattr(settings, 'VISION_MODEL', 'llava')  # 或 qwen2-vl
        self.audio_model = getattr(settings, 'AUDIO_MODEL', 'whisper')
        self._http_client: Optional[httpx.AsyncClient] = None
    
    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=120.0)
        return self._http_client
    
    async def close(self):
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
    
    async def analyze_image(
        self, 
        image_base64: str, 
        prompt: str = "请详细描述这张图片的内容，特别关注是否有涉及金钱交易、转账、个人信息、可疑链接等内容。如果图片中有文字，请提取出来。"
    ) -> str:
        """
        使用视觉模型分析图片内容
        优先使用本地Ollama，失败后使用简单OCR
        """
        try:
            # 尝试使用Ollama多模态模型
            result = await self._analyze_with_ollama_vision(image_base64, prompt)
            if result:
                return result
        except Exception as e:
            logger.warning(f"Ollama视觉分析失败: {e}")
        
        # 降级：尝试提取图片中的文字特征
        try:
            return await self._extract_image_features(image_base64)
        except Exception as e:
            logger.error(f"图片特征提取失败: {e}")
            return "[图片内容无法识别]"
    
    async def _analyze_with_ollama_vision(self, image_base64: str, prompt: str) -> Optional[str]:
        """使用Ollama视觉模型分析图片"""
        try:
            # 检查是否有可用的视觉模型
            models_response = await self.http_client.get(f"{self.ollama_base_url}/api/tags")
            if models_response.status_code != 200:
                return None
            
            available_models = [m['name'] for m in models_response.json().get('models', [])]
            
            # 查找视觉模型
            vision_models = ['llava', 'llava:latest', 'qwen2-vl', 'bakllava', 'moondream']
            selected_model = None
            for vm in vision_models:
                if any(vm in m for m in available_models):
                    selected_model = next((m for m in available_models if vm in m), None)
                    break
            
            if not selected_model:
                logger.info(f"未找到视觉模型，可用模型: {available_models}")
                return None
            
            # 调用视觉模型
            response = await self.http_client.post(
                f"{self.ollama_base_url}/api/generate",
                json={
                    "model": selected_model,
                    "prompt": prompt,
                    "images": [image_base64],
                    "stream": False
                },
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('response', '')
            
        except Exception as e:
            logger.debug(f"Ollama视觉模型调用异常: {e}")
        
        return None
    
    async def _extract_image_features(self, image_base64: str) -> str:
        """从图片中提取基本特征（简化的OCR替代）"""
        try:
            # 解码图片
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # 提取基本信息
            width, height = image.size
            mode = image.mode
            
            features = [
                f"[图片分析]",
                f"尺寸: {width}x{height}",
                f"模式: {mode}",
            ]
            
            # 分析颜色分布（检测是否有红色警告等）
            if mode in ('RGB', 'RGBA'):
                # 简单的颜色分析
                pixels = list(image.getdata())
                red_count = sum(1 for p in pixels if len(p) >= 3 and p[0] > 200 and p[1] < 100 and p[2] < 100)
                if red_count > len(pixels) * 0.1:
                    features.append("检测到大量红色元素（可能是警告或紧急信息）")
            
            return " | ".join(features)
            
        except Exception as e:
            logger.error(f"图片特征提取异常: {e}")
            return "[图片解析失败]"
    
    async def transcribe_audio(self, audio_data: bytes, audio_format: str = "mp3") -> str:
        """
        将音频转换为文字
        优先使用本地Whisper模型，失败后返回占位符
        """
        try:
            # 尝试使用Ollama的whisper模型（如果可用）
            result = await self._transcribe_with_local_whisper(audio_data)
            if result:
                return result
        except Exception as e:
            logger.warning(f"本地语音转写失败: {e}")
        
        # 降级提示
        return "[音频内容待转写 - 请确保安装了Whisper模型或配置了语音识别API]"
    
    async def _transcribe_with_local_whisper(self, audio_data: bytes) -> Optional[str]:
        """
        使用本地Whisper模型转写音频
        注意：这需要单独安装whisper或faster-whisper
        """
        try:
            # 检查是否安装了whisper
            import whisper
            
            # 保存临时文件
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
                f.write(audio_data)
                temp_path = f.name
            
            try:
                # 加载模型并转写
                model = whisper.load_model("base")  # 可选: tiny, base, small, medium, large
                result = model.transcribe(temp_path, language="zh")
                return result.get("text", "")
            finally:
                # 清理临时文件
                Path(temp_path).unlink(missing_ok=True)
                
        except ImportError:
            logger.info("Whisper未安装，跳过本地语音转写")
            return None
        except Exception as e:
            logger.debug(f"Whisper转写异常: {e}")
            return None
    
    async def process_multimodal_input(
        self,
        text: str = "",
        image_base64: str = "",
        audio_data: Optional[bytes] = None,
    ) -> dict:
        """
        统一处理多模态输入，返回融合后的文本内容
        """
        results = {
            "original_text": text,
            "image_analysis": "",
            "audio_transcript": "",
            "combined_content": text,
            "modalities_used": ["text"] if text else [],
        }
        
        tasks = []
        
        # 图片分析
        if image_base64:
            tasks.append(("image", self.analyze_image(image_base64)))
        
        # 音频转写
        if audio_data:
            tasks.append(("audio", self.transcribe_audio(audio_data)))
        
        # 并行处理
        if tasks:
            for task_type, coro in tasks:
                try:
                    result = await coro
                    if task_type == "image":
                        results["image_analysis"] = result
                        results["modalities_used"].append("image")
                    elif task_type == "audio":
                        results["audio_transcript"] = result
                        results["modalities_used"].append("audio")
                except Exception as e:
                    logger.error(f"{task_type}处理失败: {e}")
        
        # 融合内容
        combined_parts = []
        if text:
            combined_parts.append(f"[文本内容] {text}")
        if results["image_analysis"]:
            combined_parts.append(f"[图片分析] {results['image_analysis']}")
        if results["audio_transcript"]:
            combined_parts.append(f"[语音转写] {results['audio_transcript']}")
        
        results["combined_content"] = "\n".join(combined_parts) if combined_parts else text
        
        return results


# 全局单例
multimodal_service = MultimodalService()
