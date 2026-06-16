from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from mangum import Mangum

from . import crud, models, schemas, auth, database

# Create tables if they don't exist (useful for MVP/Local)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Livro Caixa Simples API")

@app.get("/")
def read_root():
    return {"message": "Welcome to Livro Caixa Simples API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Accounts
@app.get("/accounts", response_model=List[schemas.Account])
def read_accounts(db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.get_accounts(db, user_id=user_id)

@app.post("/accounts", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.create_account(db, account=account, user_id=user_id)

# Categories
@app.get("/categories", response_model=List[schemas.Category])
def read_categories(db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.get_categories(db, user_id=user_id)

@app.post("/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.create_category(db, category=category, user_id=user_id)

# Transactions
@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.get_transactions(db, user_id=user_id)

@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.create_transaction(db, transaction=transaction, user_id=user_id)

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    success = crud.delete_transaction(db, transaction_id=transaction_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# Settings
@app.get("/settings", response_model=schemas.Setting)
def read_settings(db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    settings = crud.get_settings(db, user_id=user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings

@app.post("/settings", response_model=schemas.Setting)
def update_settings(settings: schemas.SettingCreate, db: Session = Depends(database.get_db), user_id: str = Depends(auth.get_current_user)):
    return crud.create_or_update_settings(db, settings=settings, user_id=user_id)

handler = Mangum(app)
