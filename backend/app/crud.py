from sqlalchemy.orm import Session
from . import models, schemas

# Accounts
def get_accounts(db: Session, user_id: str):
    return db.query(models.Account).filter(models.Account.user_id == user_id).all()

def create_account(db: Session, account: schemas.AccountCreate, user_id: str):
    db_account = models.Account(**account.model_dump(), user_id=user_id)
    db_account.current_balance = account.initial_balance
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

# Categories
def get_categories(db: Session, user_id: str):
    return db.query(models.Category).filter(models.Category.user_id == user_id).all()

def create_category(db: Session, category: schemas.CategoryCreate, user_id: str):
    db_category = models.Category(**category.model_dump(), user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Transactions
def get_transactions(db: Session, user_id: str):
    return db.query(models.Transaction).filter(models.Transaction.user_id == user_id).all()

def create_transaction(db: Session, transaction: schemas.TransactionCreate, user_id: str):
    db_transaction = models.Transaction(**transaction.model_dump(), user_id=user_id)
    
    # Update Balance
    if transaction.type == 'Entrada':
        account = db.query(models.Account).filter(models.Account.id == transaction.account_id, models.Account.user_id == user_id).first()
        if account:
            account.current_balance += transaction.value
    elif transaction.type == 'Saída':
        account = db.query(models.Account).filter(models.Account.id == transaction.account_id, models.Account.user_id == user_id).first()
        if account:
            account.current_balance -= transaction.value
    elif transaction.type == 'Transferência' and transaction.destination_account_id:
        from_account = db.query(models.Account).filter(models.Account.id == transaction.account_id, models.Account.user_id == user_id).first()
        to_account = db.query(models.Account).filter(models.Account.id == transaction.destination_account_id, models.Account.user_id == user_id).first()
        if from_account and to_account:
            from_account.current_balance -= transaction.value
            to_account.current_balance += transaction.value

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# Settings
def get_settings(db: Session, user_id: str):
    return db.query(models.Setting).filter(models.Setting.user_id == user_id).first()

def create_or_update_settings(db: Session, settings: schemas.SettingCreate, user_id: str):
    # ... (existing code)

def delete_transaction(db: Session, transaction_id: int, user_id: str):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
    if not db_transaction:
        return False
    
    # Revert Balance
    if db_transaction.type == 'Entrada':
        account = db.query(models.Account).filter(models.Account.id == db_transaction.account_id, models.Account.user_id == user_id).first()
        if account:
            account.current_balance -= db_transaction.value
    elif db_transaction.type == 'Saída':
        account = db.query(models.Account).filter(models.Account.id == db_transaction.account_id, models.Account.user_id == user_id).first()
        if account:
            account.current_balance += db_transaction.value
    elif db_transaction.type == 'Transferência' and db_transaction.destination_account_id:
        from_account = db.query(models.Account).filter(models.Account.id == db_transaction.account_id, models.Account.user_id == user_id).first()
        to_account = db.query(models.Account).filter(models.Account.id == db_transaction.destination_account_id, models.Account.user_id == user_id).first()
        if from_account and to_account:
            from_account.current_balance += db_transaction.value
            to_account.current_balance -= db_transaction.value

    db.delete(db_transaction)
    db.commit()
    return True
