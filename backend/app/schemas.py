from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class AccountBase(BaseModel):
    name: str
    type: str
    initial_balance: float = 0.0

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: int
    user_id: str
    current_balance: float

    model_config = ConfigDict(from_attributes=True)

class CategoryBase(BaseModel):
    name: str
    type: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    user_id: str

    model_config = ConfigDict(from_attributes=True)

class TransactionBase(BaseModel):
    date: str
    value: float
    description: Optional[str] = None
    type: str
    account_id: int
    destination_account_id: Optional[int] = None
    category_id: int
    custom_fields: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    user_id: str

    model_config = ConfigDict(from_attributes=True)

class SettingBase(BaseModel):
    entity_name: Optional[str] = None
    entity_type: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    profile_image: Optional[str] = None
    custom_fields_schema: Optional[str] = None
    print_settings: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class Setting(SettingBase):
    id: int
    user_id: str

    model_config = ConfigDict(from_attributes=True)
