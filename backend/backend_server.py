"""
FastAPI backend server for HaleAI Medical Chatbot
Connects React frontend to the existing chatbot backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
import time
from datetime import datetime

# Import your existing chatbot
from chatbot import HaleAI

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="HaleAI Medical Chatbot API",
    description="Backend API for HaleAI medical chatbot",
    version="1.0.0"
)

# CORS middleware to allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize chatbot
chatbot = None
startup_error = None

@app.on_event("startup")
async def startup_event():
    """Initialize chatbot on startup"""
    global chatbot, startup_error
    try:
        logger.info("Initializing HaleAI chatbot...")
        chatbot = HaleAI()
        chatbot.connect()
        logger.info("✅ Chatbot initialized successfully")
    except Exception as e:
        startup_error = str(e)
        logger.error(f"❌ Failed to initialize chatbot: {e}", exc_info=True)

# Request/Response models
class QueryRequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, str]]] = []

class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict] = []
    num_sources: int
    status: str
    metadata: Dict
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    message: str
    timestamp: str

# API Endpoints
@app.get("/", response_model=Dict)
async def root():
    """Root endpoint"""
    return {
        "message": "HaleAI Medical Chatbot API",
        "version": "1.0.0",
        "status": "online" if chatbot else "error",
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    if chatbot is None:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {startup_error or 'Chatbot not initialized'}"
        )
    
    return HealthResponse(
        status="healthy",
        message="All systems operational",
        timestamp=datetime.now().isoformat()
    )

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process a medical query"""
    if chatbot is None:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {startup_error or 'Chatbot not initialized'}"
        )
    
    if not request.question or not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )
    
    try:
        logger.info(f"Processing query: {request.question[:100]}...")
        start_time = time.time()
        
        # Process query using your existing chatbot
        response = chatbot.query(
            user_question=request.question,
            history=request.history,
            use_reranking=True
        )
        
        processing_time = time.time() - start_time
        
        # Format sources for frontend
        formatted_sources = []
        if response.get("sources"):
            for doc in response["sources"]:
                formatted_sources.append({
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "page": doc.metadata.get("page", "N/A"),
                    "source": doc.metadata.get("source", "Unknown")
                })
        
        return QueryResponse(
            answer=response["answer"],
            sources=formatted_sources,
            num_sources=response.get("num_sources", 0),
            status=response.get("status", "success"),
            metadata={
                **response.get("metadata", {}),
                "processing_time": f"{processing_time:.2f}s"
            },
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
        )

@app.get("/metrics")
async def get_metrics():
    """Get system metrics"""
    import psutil
    
    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )