import os
import datetime as dt
import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, String, create_engine, select
from sqlalchemy.orm import declarative_base, Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://inventory:inventory@inventory-db/inventory")
engine = create_engine(DATABASE_URL, echo=False, future=True)
Base = declarative_base()


class Item(Base):
    __tablename__ = "items"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    unit = Column(String(20), default="unit")
    stock = Column(Integer, default=0)
    min_threshold = Column(Integer, default=5)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class ItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str = "unit"
    stock: int = 0
    min_threshold: int = 5


class ItemOut(BaseModel):
    id: str
    name: str
    category: Optional[str] = None
    unit: str
    stock: int
    min_threshold: int
    created_at: dt.datetime
    updated_at: dt.datetime


class StockUpdate(BaseModel):
    delta: int
    note: Optional[str] = None


app = FastAPI(title="Inventory Service", version="0.1.0")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    with Session(engine) as session:
        yield session


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "inventory"}


@app.post("/inventory/items", response_model=ItemOut, status_code=201)
async def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    item = Item(
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        stock=payload.stock,
        min_threshold=payload.min_threshold,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/inventory/items", response_model=List[ItemOut])
async def list_items(db: Session = Depends(get_db)):
    items = db.scalars(select(Item).order_by(Item.created_at.desc())).all()
    return items


@app.patch("/inventory/items/{item_id}/stock", response_model=ItemOut)
async def update_stock(item_id: str, payload: StockUpdate, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    new_stock = item.stock + payload.delta
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    item.stock = new_stock
    db.commit()
    db.refresh(item)
    return item


@app.get("/inventory/low-stock", response_model=List[ItemOut])
async def low_stock(db: Session = Depends(get_db)):
    items = db.scalars(select(Item).where(Item.stock <= Item.min_threshold)).all()
    return items


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8002)),
        reload=True,
    )
