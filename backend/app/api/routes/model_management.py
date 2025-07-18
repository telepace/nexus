"""
Model Management API routes for LiteLLM hot reload functionality.
支持动态添加、删除、更新模型配置而无需重启服务。
"""

import logging
from typing import Any

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


class ModelConfig(BaseModel):
    """模型配置结构"""

    model_name: str
    litellm_params: dict[str, Any]


class ModelListResponse(BaseModel):
    """模型列表响应结构"""

    models: list[dict[str, Any]]


class ModelOperationResponse(BaseModel):
    """模型操作响应结构"""

    success: bool
    message: str
    model_name: str | None = None


async def _call_litellm_admin_api(
    method: str, endpoint: str, data: dict[str, Any] | None = None
) -> dict[str, Any]:
    """调用 LiteLLM 管理 API"""
    try:
        base_url = str(settings.LITELLM_PROXY_URL).rstrip("/")
        url = f"{base_url}/{endpoint.lstrip('/')}"

        headers = {"Content-Type": "application/json"}
        if settings.LITELLM_MASTER_KEY:
            headers["Authorization"] = f"Bearer {settings.LITELLM_MASTER_KEY}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await client.post(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = await client.delete(url, headers=headers)
            elif method.upper() == "PUT":
                response = await client.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

    except httpx.HTTPStatusError as e:
        logger.error(f"LiteLLM API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"LiteLLM API error: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Failed to call LiteLLM API: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with LiteLLM service: {str(e)}",
        )


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    _current_user: User = Depends(get_current_user),
):
    """
    获取当前已配置的所有模型列表
    """
    try:
        result = await _call_litellm_admin_api("GET", "/model/info")
        return ModelListResponse(models=result.get("data", []))
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/add", response_model=ModelOperationResponse)
async def add_model(
    model_config: ModelConfig = Body(...),
    _current_user: User = Depends(get_current_user),
):
    """
    动态添加新的模型配置
    """
    try:
        # 准备 LiteLLM 模型配置格式
        litellm_config = {
            "model_name": model_config.model_name,
            "litellm_params": model_config.litellm_params,
        }

        await _call_litellm_admin_api("POST", "/model/new", litellm_config)

        return ModelOperationResponse(
            success=True,
            message=f"Model '{model_config.model_name}' added successfully",
            model_name=model_config.model_name,
        )

    except Exception as e:
        logger.error(f"Failed to add model {model_config.model_name}: {str(e)}")
        return ModelOperationResponse(
            success=False,
            message=f"Failed to add model: {str(e)}",
            model_name=model_config.model_name,
        )


@router.delete("/models/{model_name}", response_model=ModelOperationResponse)
async def delete_model(
    model_name: str,
    _current_user: User = Depends(get_current_user),
):
    """
    动态删除模型配置
    """
    try:
        await _call_litellm_admin_api("POST", "/model/delete", {"id": model_name})

        return ModelOperationResponse(
            success=True,
            message=f"Model '{model_name}' deleted successfully",
            model_name=model_name,
        )

    except Exception as e:
        logger.error(f"Failed to delete model {model_name}: {str(e)}")
        return ModelOperationResponse(
            success=False,
            message=f"Failed to delete model: {str(e)}",
            model_name=model_name,
        )


@router.put("/models/{model_name}", response_model=ModelOperationResponse)
async def update_model(
    model_name: str,
    model_config: ModelConfig = Body(...),
    _current_user: User = Depends(get_current_user),
):
    """
    动态更新模型配置
    """
    try:
        # 先删除旧配置
        try:
            await _call_litellm_admin_api("POST", "/model/delete", {"id": model_name})
        except Exception:
            pass  # 如果模型不存在，忽略删除错误

        # 添加新配置
        litellm_config = {
            "model_name": model_config.model_name,
            "litellm_params": model_config.litellm_params,
        }

        await _call_litellm_admin_api("POST", "/model/new", litellm_config)

        return ModelOperationResponse(
            success=True,
            message=f"Model '{model_name}' updated successfully",
            model_name=model_name,
        )

    except Exception as e:
        logger.error(f"Failed to update model {model_name}: {str(e)}")
        return ModelOperationResponse(
            success=False,
            message=f"Failed to update model: {str(e)}",
            model_name=model_name,
        )


@router.post("/models/gemini/add-latest", response_model=ModelOperationResponse)
async def add_latest_gemini_models(
    _current_user: User = Depends(get_current_user),
):
    """
    一键添加最新的 Gemini 模型配置
    """
    try:
        # 定义最新的 Gemini 模型配置
        gemini_models = [
            {
                "model_name": "gemini-2.5-flash-05-20",
                "litellm_params": {
                    "model": "gemini/gemini-2.5-flash-05-20",
                    "api_key": "os.environ/GEMINI_API_KEY",
                },
            },
            {
                "model_name": "gemini-2.5-pro",
                "litellm_params": {
                    "model": "gemini/gemini-2.5-pro",
                    "api_key": "os.environ/GEMINI_API_KEY",
                },
            },
            {
                "model_name": "gemini-2.0-flash",
                "litellm_params": {
                    "model": "gemini/gemini-2.0-flash",
                    "api_key": "os.environ/GEMINI_API_KEY",
                },
            },
        ]

        added_models = []
        for model_config in gemini_models:
            try:
                await _call_litellm_admin_api("POST", "/model/new", model_config)
                added_models.append(model_config["model_name"])
            except Exception as e:
                logger.warning(f"Failed to add {model_config['model_name']}: {str(e)}")

        return ModelOperationResponse(
            success=True,
            message=f"Successfully added Gemini models: {', '.join(added_models)}",
        )

    except Exception as e:
        logger.error(f"Failed to add Gemini models: {str(e)}")
        return ModelOperationResponse(
            success=False, message=f"Failed to add Gemini models: {str(e)}"
        )


@router.get("/models/health")
async def check_models_health(
    _current_user: User = Depends(get_current_user),
):
    """
    检查所有模型的健康状态
    """
    try:
        result = await _call_litellm_admin_api("GET", "/health")
        return result
    except Exception as e:
        logger.error(f"Failed to check models health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
