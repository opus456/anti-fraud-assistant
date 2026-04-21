"""
多模态处理服务 - 支持文本、图片、音频的统一处理
提供本地Ollama多模态模型和远程API的双重支持
增强：OCR文字识别 + SpeechRecognition语音转写 兜底
"""
from __future__ import annotations

import base64
import logging
import asyncio
import tempfile
import os
from typing import Optional
from pathlib import Path

import httpx
from PIL import Image
import io

from app.config import settings

logger = logging.getLogger(__name__)


class MultimodalService:
    """多模态处理服务 - 图像理解、语音转文字"""
    
    _ocr_engine = None  # 类级缓存 RapidOCR 引擎
    _ocr_init_failed = False  # 标记 OCR 初始化是否失败过

    def __init__(self):
        self.ollama_base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.vision_model = getattr(settings, 'VISION_MODEL', 'llava')  # 或 qwen2-vl
        self.audio_model = getattr(settings, 'AUDIO_MODEL', 'whisper')
        self._http_client: Optional[httpx.AsyncClient] = None

    @classmethod
    def _get_ocr_engine(cls):
        """获取缓存的 RapidOCR 引擎实例"""
        if cls._ocr_init_failed:
            return None
        if cls._ocr_engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                cls._ocr_engine = RapidOCR()
                logger.info("RapidOCR 引擎已初始化并缓存")
            except ImportError:
                cls._ocr_init_failed = True
                logger.info("RapidOCR 未安装")
            except Exception as e:
                cls._ocr_init_failed = True
                logger.warning(f"RapidOCR 初始化失败: {e}")
        return cls._ocr_engine
    
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
        prompt: str = ""
    ) -> str:
        """
        从图片中提取文字和特征（纯 OCR，不再重复调用 Ollama）
        """
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
        """从图片中提取文字和特征 - 优先使用 RapidOCR，降级 pytesseract"""
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # 尝试 OCR 文字识别
            ocr_text = ""

            # 方案1: RapidOCR（纯 Python，支持中文，推荐，引擎已缓存）
            engine = self._get_ocr_engine()
            if engine and not ocr_text:
                try:
                    import numpy as np
                    img_array = np.array(image.convert('RGB'))
                    result, _ = engine(img_array)
                    if result:
                        ocr_text = " ".join([line[1] for line in result])
                        ocr_text = ocr_text.strip()
                        if ocr_text:
                            logger.info(f"RapidOCR识别文字: {ocr_text[:200]}")
                except Exception as e:
                    logger.warning(f"RapidOCR识别失败: {e}")

            # 方案2: pytesseract 降级
            if not ocr_text:
                try:
                    import pytesseract
                    gray = image.convert('L')
                    ocr_text = pytesseract.image_to_string(gray, lang='chi_sim+eng')
                    ocr_text = ocr_text.strip()
                    if ocr_text:
                        logger.info(f"pytesseract识别文字: {ocr_text[:200]}")
                except ImportError:
                    logger.info("pytesseract未安装，跳过OCR")
                except Exception as e:
                    logger.warning(f"pytesseract识别失败: {e}")

            if ocr_text:
                return f"识别到的文字内容: {ocr_text}"

            width, height = image.size
            return f"[图片分析] 尺寸: {width}x{height}，未识别到文字"
            
        except Exception as e:
            logger.error(f"图片特征提取异常: {e}")
            return "[图片解析失败]"
    
    async def transcribe_audio(self, audio_data: bytes, audio_format: str = "mp3") -> str:
        """
        将音频转换为文字
        优先使用本地Whisper模型，其次SpeechRecognition，最后降级
        """
        # 1. 尝试 Whisper
        try:
            result = await self._transcribe_with_local_whisper(audio_data)
            if result:
                return result
        except Exception as e:
            logger.warning(f"本地Whisper转写失败: {e}")
        
        # 2. 尝试 SpeechRecognition
        try:
            result = await self._transcribe_with_speech_recognition(audio_data)
            if result:
                return result
        except Exception as e:
            logger.warning(f"SpeechRecognition转写失败: {e}")
        
        # 3. 降级提示
        return "[音频内容待转写 - 请确保安装了语音识别依赖]"
    
    async def _transcribe_with_speech_recognition(self, audio_data: bytes) -> Optional[str]:
        """使用 SpeechRecognition 库进行语音转写"""
        try:
            import speech_recognition as sr
            
            # 保存临时文件
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                # 尝试用 pydub 转换格式
                try:
                    from pydub import AudioSegment
                    audio_io = io.BytesIO(audio_data)
                    # 自动检测格式
                    for fmt in ['mp3', 'wav', 'ogg', 'm4a', 'webm']:
                        try:
                            audio_io.seek(0)
                            audio = AudioSegment.from_file(audio_io, format=fmt)
                            audio.export(f.name, format="wav")
                            break
                        except Exception:
                            continue
                    else:
                        # 直接写原始数据
                        f.write(audio_data)
                except ImportError:
                    f.write(audio_data)
                temp_path = f.name
            
            try:
                recognizer = sr.Recognizer()
                with sr.AudioFile(temp_path) as source:
                    audio = recognizer.record(source)
                
                # 使用 Google 免费 API 识别
                text = recognizer.recognize_google(audio, language="zh-CN")
                logger.info(f"SpeechRecognition转写成功: {text[:100]}")
                return text
            finally:
                Path(temp_path).unlink(missing_ok=True)
                
        except ImportError:
            logger.info("SpeechRecognition未安装")
            return None
        except Exception as e:
            logger.debug(f"SpeechRecognition转写异常: {e}")
            return None
    
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
