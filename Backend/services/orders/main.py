import os
import datetime as dt
import uuid
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, String, Integer, create_engine, select
from sqlalchemy.orm import declarative_base, Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://orders:orders@orders-db/orders")
engine = create_engine(DATABASE_URL, echo=False, future=True)
Base = declarative_base()


class Order(Base):
    __tablename__ = "orders"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    status = Column(String(20), default="pending", index=True)
    customer_email = Column(String(255), nullable=True)
    delivery_type = Column(String(20), default="delivery")  # delivery|pickup|dine_in
    total_amount = Column(Integer, default=0)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)


class OrderCreate(BaseModel):
    customer_email: Optional[str] = None
    delivery_type: str = "delivery"
    total_amount: int = 0


class OrderOut(BaseModel):
    id: str
    status: str
    customer_email: Optional[str] = None
    delivery_type: str
    total_amount: int
    created_at: dt.datetime
    updated_at: dt.datetime


class OrderUpdateStatus(BaseModel):
    status: str


app = FastAPI(title="Orders Service", version="0.1.0")


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
    return {"status": "ok", "service": "orders"}


@app.post("/orders", response_model=OrderOut, status_code=201)
async def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    order = Order(
        customer_email=payload.customer_email.lower() if payload.customer_email else None,
        delivery_type=payload.delivery_type,
        total_amount=payload.total_amount,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=List[OrderOut])
async def list_orders(db: Session = Depends(get_db)):
    orders = db.scalars(select(Order).order_by(Order.created_at.desc())).all()
    return orders


@app.patch("/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(order_id: str, payload: OrderUpdateStatus, db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8001)),
        reload=True,
    )
