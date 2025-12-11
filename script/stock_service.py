#!/usr/bin/env python3
"""
Merf Stock Engine - Financial Analysis Microservice
FastAPI-based stock analysis using Yahoo Finance API directly.
Pure Python implementation without numpy C extensions.
"""

import os
import json
import requests
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import uvicorn

app = FastAPI(
    title="Merf Stock Engine",
    description="Finansal analiz ve teknik gösterge mikroservisi.",
    version="1.0.0"
)

API_SECRET = os.environ.get("SERVICE_SECRET", "merf_stock_secret_123")

class StockRequest(BaseModel):
    symbol: str
    period: str = "1mo"
    interval: str = "1d"

class StockResponse(BaseModel):
    symbol: str
    price: float
    change_percent: float
    rsi: float
    recommendation: str
    period: str
    data_points: int

def calculate_rsi(closes: List[float], window: int = 14) -> float:
    """Calculate RSI using pure Python (Wilder's smoothing method)"""
    if len(closes) < window + 1:
        return 50.0
    
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    
    gains = []
    losses = []
    
    for d in deltas:
        if d > 0:
            gains.append(d)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(d))
    
    if len(gains) < window:
        return 50.0
    
    avg_gain = sum(gains[:window]) / window
    avg_loss = sum(losses[:window]) / window
    
    for i in range(window, len(gains)):
        avg_gain = (avg_gain * (window - 1) + gains[i]) / window
        avg_loss = (avg_loss * (window - 1) + losses[i]) / window
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return round(rsi, 2)

def get_period_seconds(period: str) -> int:
    """Convert period string to seconds"""
    period_map = {
        "1d": 86400,
        "5d": 5 * 86400,
        "1mo": 30 * 86400,
        "3mo": 90 * 86400,
        "6mo": 180 * 86400,
        "1y": 365 * 86400,
        "2y": 2 * 365 * 86400,
        "5y": 5 * 365 * 86400,
        "10y": 10 * 365 * 86400,
        "ytd": int((datetime.now() - datetime(datetime.now().year, 1, 1)).total_seconds()),
        "max": 50 * 365 * 86400
    }
    return period_map.get(period, 30 * 86400)

def fetch_yahoo_data(symbol: str, period: str = "1mo", interval: str = "1d") -> Dict[str, Any]:
    """Fetch stock data from Yahoo Finance API directly"""
    
    period_seconds = get_period_seconds(period)
    end_time = int(datetime.now().timestamp())
    start_time = end_time - period_seconds
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {
        "period1": start_time,
        "period2": end_time,
        "interval": interval,
        "includePrePost": "false",
        "events": "div,splits"
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    response = requests.get(url, params=params, headers=headers, timeout=10)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Yahoo Finance API error")
    
    data = response.json()
    
    if "chart" not in data or "result" not in data["chart"] or not data["chart"]["result"]:
        raise HTTPException(status_code=404, detail=f"{symbol} için veri bulunamadı.")
    
    result = data["chart"]["result"][0]
    
    if "indicators" not in result or "quote" not in result["indicators"]:
        raise HTTPException(status_code=404, detail=f"{symbol} için fiyat verisi bulunamadı.")
    
    quote = result["indicators"]["quote"][0]
    
    closes = quote.get("close", [])
    closes = [c for c in closes if c is not None]
    
    if not closes:
        raise HTTPException(status_code=404, detail=f"{symbol} için kapanış verisi bulunamadı.")
    
    return {
        "symbol": result["meta"]["symbol"],
        "closes": closes,
        "currency": result["meta"].get("currency", "TRY"),
        "regularMarketPrice": result["meta"].get("regularMarketPrice", closes[-1])
    }

@app.get("/")
def home():
    return {"status": "Online", "role": "Financial Analysis Microservice", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Merf Stock Engine"}

@app.post("/analyze", response_model=StockResponse)
def analyze_stock(request: StockRequest, x_api_token: Optional[str] = Header(None)):
    if x_api_token != API_SECRET:
        raise HTTPException(status_code=401, detail="Yetkisiz Erişim!")
    
    symbol = request.symbol.upper()
    if len(symbol) <= 5 and not symbol.endswith(".IS") and "USD" not in symbol:
        symbol += ".IS"
    
    try:
        data = fetch_yahoo_data(symbol, request.period, request.interval)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veri çekme hatası: {str(e)}")
    
    closes = data["closes"]
    current_price = closes[-1]
    start_price = closes[0]
    change_pct = ((current_price - start_price) / start_price) * 100
    
    rsi_val = calculate_rsi(closes, window=14)
    
    recommendation = "NÖTR"
    if rsi_val < 30:
        recommendation = "AL (Aşırı Satım)"
    elif rsi_val > 70:
        recommendation = "SAT (Aşırı Alım)"
    
    return StockResponse(
        symbol=data["symbol"],
        price=round(float(current_price), 2),
        change_percent=round(float(change_pct), 2),
        rsi=rsi_val,
        recommendation=recommendation,
        period=request.period,
        data_points=len(closes)
    )

if __name__ == "__main__":
    port = int(os.environ.get("STOCK_SERVICE_PORT", 8082))
    print(f"[StockEngine] Starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
