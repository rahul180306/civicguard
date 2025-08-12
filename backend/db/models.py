from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime

Base = declarative_base()

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True)        # UUID string
    iclass = Column(String, nullable=False)      # pothole, garbage, etc.
    severity = Column(String, nullable=True)     # e.g., low/medium/high
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    status = Column(String, default="CREATED")
    authority = Column(String, nullable=True)
    authority_ticket_id = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    media_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def as_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
