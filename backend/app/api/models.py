"""CRUD endpoints for vehicle make/model definitions."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.entity_audit import record_entity_event
from app.core.security import StaffPrincipal, require_admin, require_staff
from app.db.session import get_db
from app.models.models import Model
from app.schemas import Model as ModelSchema, ModelCreate, ModelUpdate

router = APIRouter(prefix="/api/v1/models", tags=["models"], dependencies=[Depends(require_staff)])


@router.get("", response_model=list[ModelSchema])
def list_models(db: Session = Depends(get_db)):
    """List all models"""
    models = db.query(Model).all()
    return models


@router.get("/{model_name}", response_model=ModelSchema)
def get_model(model_name: str, db: Session = Depends(get_db)):
    """Get a specific model by name"""
    model = db.query(Model).filter(Model.model_name == model_name).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    return model


@router.post("", response_model=ModelSchema, status_code=status.HTTP_201_CREATED)
def create_model(
    model: ModelCreate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new model"""
    db_model = Model(**model.dict())
    db.add(db_model)
    try:
        db.flush()
        record_entity_event(
            db,
            actor=current_user,
            action="CREATED",
            entity_type="model",
            entity_id=db_model.model_name,
            notes=f"Created model {db_model.make_name} {db_model.model_name}.",
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model name must be unique and class_id must reference an existing car class",
        ) from exc
    db.refresh(db_model)
    return db_model


@router.put("/{model_name}", response_model=ModelSchema)
def update_model(
    model_name: str,
    model: ModelUpdate,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a model"""
    db_model = db.query(Model).filter(Model.model_name == model_name).first()
    if not db_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    # Apply only fields provided in the request payload.
    update_data = model.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_model, field, value)
    record_entity_event(
        db,
        actor=current_user,
        action="UPDATED",
        entity_type="model",
        entity_id=model_name,
        notes=f"Updated model fields: {', '.join(update_data.keys()) or 'none'}.",
    )
    
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model class_id must reference an existing car class",
        ) from exc
    db.refresh(db_model)
    return db_model


@router.delete("/{model_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(
    model_name: str,
    current_user: StaffPrincipal = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a model"""
    db_model = db.query(Model).filter(Model.model_name == model_name).first()
    if not db_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    
    try:
        record_entity_event(
            db,
            actor=current_user,
            action="DELETED",
            entity_type="model",
            entity_id=model_name,
            notes=f"Deleted model {db_model.make_name} {db_model.model_name}.",
        )
        db.delete(db_model)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model has cars and cannot be deleted",
        ) from exc
    return None
