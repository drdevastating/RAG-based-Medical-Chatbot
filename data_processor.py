"""
Data processing utilities for HaleAI
Handles PDF loading, text splitting, and embeddings
"""
from typing import List
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
# Try multiple possible HuggingFace embeddings imports to support different
# langchain-related package layouts without forcing a specific package install
try:
    from langchain_huggingface import HuggingFaceEmbeddings
    _EMB_SOURCE = "langchain_huggingface"
except Exception:
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        _EMB_SOURCE = "langchain_community.embeddings"
    except Exception:
        # Last resort: try the embedding offered by core langchain if present
        try:
            from langchain.embeddings import HuggingFaceEmbeddings
            _EMB_SOURCE = "langchain.embeddings"
        except Exception:
            raise ImportError(
                "Could not import HuggingFaceEmbeddings. Please install one of: "
                "langchain-huggingface, langchain-community, or a compatible langchain package."
            )

# Document import: prefer langchain_core.documents when available
try:
    from langchain_core.documents import Document
except Exception:
    try:
        from langchain.schema import Document
    except Exception:
        # fallback minimal Document dataclass
        from dataclasses import dataclass

        @dataclass
        class Document:
            page_content: str
            metadata: dict = None
from config import CHUNK_SIZE, CHUNK_OVERLAP, EMBEDDING_MODEL

#self._load_embeddings()
class DataProcessor:
    def __init__(self):
        self.embeddings = self._load_embeddings();
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", "? ", "! "]
        )
    def _load_embeddings(self):
        """Load HuggingFace embeddings model"""
        print(f"Loading embeddings model: {EMBEDDING_MODEL}")
        model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        print("Embeddings model loaded")
        return model
    
    def process_documents(self, data_dir: str):
        pdf_path = f"{data_dir}/Medical_book.pdf"
        print(f"Loading PDF: {pdf_path}")
        
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()  
        
        chunks = []
        for page_num, page in enumerate(pages, 1):
            text = page.page_content
            split_texts = self.text_splitter.split_text(text)
            for chunk in split_texts:
                chunks.append(Document(
                    page_content=chunk,
                    metadata={
                        "page": page_num,
                        "source": "Medical_book.pdf"
                    }
                ))
        print(f"Created {len(chunks)} chunks with page numbers")
        return chunks