import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud, models, schemas
from app.api import deps
from app.core.storage import StorageInterface  # Import StorageInterface

router = APIRouter()


@router.post(
    "/upload-url",
    response_model=schemas.PresignedURLResponse,
    summary="Get a presigned URL for uploading a file to S3/R2-compatible storage.",
    status_code=200,
)
async def get_upload_url(
    *,
    # Use Pydantic model for request body for better validation and OpenAPI docs
    payload: schemas.PresignedURLRequest,
    current_user: models.User = Depends(deps.get_current_active_user),
    storage_service: StorageInterface = Depends(deps.get_storage_service),
) -> Any:
    """
    Get a presigned URL that can be used to upload a file directly to the storage.
    The `s3_key` returned is the path in the bucket where the file should be uploaded.
    """
    # Generate a unique blob name (s3_key) to avoid collisions,
    # possibly including user ID or a timestamp.
    # Example: f"user_uploads/{current_user.id}/{payload.filename}"
    # For simplicity, using filename directly for now, but ensure it's sanitized
    # or a UUID is used for the actual key to prevent overwrites and control structure.

    # Let's create a more robust s3_key
    file_extension = (
        payload.filename.split(".")[-1] if "." in payload.filename else "bin"
    )
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    destination_blob_name = f"user_uploads/{current_user.id}/{unique_filename}"

    presigned_url = await storage_service.get_presigned_url(
        blob_name=destination_blob_name, content_type=payload.content_type
    )

    if not presigned_url:
        raise HTTPException(status_code=500, detail="Could not generate presigned URL.")

    return {
        "presigned_url": presigned_url,
        "s3_key": destination_blob_name,
    }


@router.post(
    "/",
    response_model=schemas.ImageResponse,
    status_code=201,
    summary="Create a new image record.",
    description="After uploading a file using a presigned URL, call this endpoint to create the image metadata in the database.",
)
async def create_image_record(
    *,
    db: AsyncSession = Depends(deps.get_async_db),
    image_in: schemas.ImageCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new image record in the database.
    The `s3_key` provided should be the one returned from the `/upload-url` endpoint.
    """
    # `owner_id` is taken from the authenticated user
    image = await crud.crud_image.create_image(
        db=db, obj_in=image_in, owner_id=current_user.id
    )
    return image


@router.get(
    "/{image_id}",
    response_model=schemas.ImageResponse,
    summary="Get an image by its ID.",
)
async def read_image(
    *,
    db: AsyncSession = Depends(deps.get_async_db),
    image_id: uuid.UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a specific image by its ID.
    Users can only retrieve images they own.
    """
    image = await crud.crud_image.get_image(db=db, image_id=image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.owner_id != current_user.id:
        # Add logic here if images can be public or shared in the future
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return image


@router.get(
    "/",
    response_model=list[schemas.ImageResponse],
    summary="List images for the current user.",
)
async def list_images(
    *,
    db: AsyncSession = Depends(deps.get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),  # Added upper limit for safety
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve a list of images owned by the current user.
    """
    images = await crud.crud_image.get_multi_images_by_owner(
        db=db, owner_id=current_user.id, skip=skip, limit=limit
    )
    return images


@router.delete(
    "/{image_id}",
    response_model=schemas.ImageResponse,  # Or perhaps a status message
    summary="Delete an image.",
)
async def delete_image(
    *,
    db: AsyncSession = Depends(deps.get_async_db),
    storage_service: StorageInterface = Depends(deps.get_storage_service),
    image_id: uuid.UUID,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an image:
    - Deletes the file from S3/R2 storage.
    - Deletes the image metadata from the database.
    Users can only delete images they own.
    """
    image = await crud.crud_image.get_image(db=db, image_id=image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Delete from storage if s3_key exists
    if image.s3_key:
        try:
            await storage_service.delete_file(blob_name=image.s3_key)
        except Exception as e:
            # Log the error, but proceed to delete the DB record
            # Or decide if this should be a hard failure
            print(f"Error deleting file {image.s3_key} from storage: {e}")
            # raise HTTPException(status_code=500, detail=f"Error deleting file from storage: {e}")

    deleted_image_db_record = await crud.crud_image.remove_image(
        db=db, image_id=image_id
    )
    # remove_image returns the deleted object, so it can be returned.
    # If it returned None (e.g. if it failed or was already deleted),
    # we might want to raise an error or return a different response.
    if not deleted_image_db_record:
        # This case should ideally not happen if the previous get_image worked
        # and no other process deleted it in between.
        raise HTTPException(
            status_code=404, detail="Image not found after attempting deletion from DB."
        )

    return deleted_image_db_record  # Return the representation of the deleted image.
    # Alternatively, return a message:
    # return {"message": "Image deleted successfully"}


# TODO: Add PUT/PATCH endpoint for updating image metadata (e.g., alt_text, importance)
# @router.patch("/{image_id}", response_model=schemas.ImageResponse)
# async def update_image_metadata(...):
# ...
# image = await crud.crud_image.update_image(db=db, db_obj=image, obj_in=update_data)
