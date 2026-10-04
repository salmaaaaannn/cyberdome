import json
import math
from typing import List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ai import KnowledgeChunk, KnowledgeDocument
from app.models.website_security import WebsiteAssessment, WebsiteFinding
from google import genai
from app.core.config import settings

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)

class RAGService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    async def get_embedding(self, text: str) -> List[float]:
        if not self.client:
            return [0.0] * 768 # Dummy embedding
        
        try:
            response = await self.client.aio.models.embed_content(
                model='text-embedding-004',
                contents=text
            )
            # embeddings are inside response.embeddings[0].values
            if hasattr(response, 'embeddings') and response.embeddings:
                return response.embeddings[0].values
            return [0.0] * 768
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return [0.0] * 768

    async def retrieve_context(self, db: AsyncSession, company_id: str, query: str, limit: int = 5) -> str:
        """
        Retrieves relevant context for the given query, strictly isolated to the user's company_id.
        """
        # 1. Fetch raw findings directly from the existing Phase 2 tables for real-time context
        findings_query = select(WebsiteFinding).join(WebsiteAssessment).where(
            WebsiteAssessment.company_id == company_id
        ).order_by(WebsiteFinding.severity.desc()).limit(10)
        
        findings_result = await db.execute(findings_query)
        findings = findings_result.scalars().all()
        
        # Build realtime context from live DB
        context_parts = []
        if findings:
            context_parts.append("--- LIVE SECURITY FINDINGS (VERIFIED CYBERDOME DATA) ---")
            for f in findings:
                context_parts.append(f"Finding ID: {f.id}\nTitle: {f.title}\nSeverity: {f.severity}\nDescription: {f.description}\nImpact: {f.impact}\nStatus: {f.status}\n")
        
        # 2. RAG Retrieval from KnowledgeChunks
        query_embedding = await self.get_embedding(query)
        
        # Get chunks for this company (or global knowledge where company_id is None)
        # Note: We do similarity in python since SQLite doesn't natively support pgvector
        chunks_query = select(KnowledgeChunk).where(
            (KnowledgeChunk.company_id == company_id) | (KnowledgeChunk.company_id == None)
        )
        chunks_result = await db.execute(chunks_query)
        chunks = chunks_result.scalars().all()
        
        # Calculate similarities and sort
        scored_chunks = []
        for chunk in chunks:
            try:
                emb = json.loads(chunk.embedding) if isinstance(chunk.embedding, str) else chunk.embedding
                score = cosine_similarity(query_embedding, emb)
                scored_chunks.append((score, chunk))
            except Exception:
                continue
                
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:limit]
        
        if top_chunks:
            context_parts.append("--- KNOWLEDGE BASE CONTEXT ---")
            for score, chunk in top_chunks:
                # Only include moderately relevant chunks
                if score > 0.4:
                    context_parts.append(f"Knowledge:\n{chunk.content}\n")
        
        if not context_parts:
            return "No specific security context available."
            
        return "\n".join(context_parts)
