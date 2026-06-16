from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'Banco' | 'Local'
    initial_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # 'Entrada' | 'Saída' | 'Transferência'

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    date = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    description = Column(String)
    type = Column(String, nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    destination_account_id = Column(Integer, ForeignKey("accounts.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    custom_fields = Column(Text) # JSON string

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, unique=True, nullable=False)
    entity_name = Column(String)
    entity_type = Column(String) # 'Empresa' | 'Igreja' | 'Pessoal'
    country = Column(String)
    currency = Column(String)
    profile_image = Column(Text)
    custom_fields_schema = Column(Text)
    print_settings = Column(Text)
