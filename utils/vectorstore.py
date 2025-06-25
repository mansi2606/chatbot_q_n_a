### utils/vectorstore.py
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from llama_parse import LlamaParse
from langchain.docstore.document import Document
import os

# llama_parse = LlamaParse(api_key=os.getenv("LLAMAPARSE_API_KEY"))

PDF_PATH = "SSIP_Brochure.pdf"
vectorstore = None

def doc_parser(pdf_path,):
    # 📥 Step 1: Load the PDF using LlamaParse (extracts text + tables + images)
    loader = LlamaParse(
        api_key=os.getenv("LLAMAPARSE_API_KEY"),
        result_type="markdown",  # Can also try "text" or "json"
        parsing_instructions="""
        - Convert all tables into structured key-value JSON.
        - For each section, keep its title as metadata.
        - Ignore headers/footers/logos that are not meaningful content.
        """
    )
    docs = loader.load_data(file_path = pdf_path)
    
    #convert docs to langchain_docs
    langchain_docs = []

    for doc in docs:
        # LlamaParse returns llama_index Document objects with .text and .metadata
        langchain_docs.append(Document(
            page_content=doc.text,
            metadata=doc.metadata  # Includes things like page number, section
        ))

    return langchain_docs



def load_vectorstore():
    global vectorstore
    print("📦 Initializing vectorstore...")  # Add this
    try:
        vectorstore = FAISS.load_local("faiss_index", OpenAIEmbeddings(model="text-embedding-3-small"), allow_dangerous_deserialization=True )
        print("✅Loaded existing FAISS index.")
    except Exception as e:
        print("⚠️ Could not load FAISS index, building a new one...", e)
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        docs = doc_parser(PDF_PATH)
        text_splitter = SemanticChunker(embeddings=embeddings)
        chunks = text_splitter.split_documents(docs)
        # print(chunks[8])
        # print(embeddings)
        vectorstore = FAISS.from_documents(chunks, embeddings)
        vectorstore.save_local("faiss_index")


def get_vectorstore():
    if vectorstore is None:
        raise RuntimeError("Vectorstore not initialized. Did you forget to call load_vectorstore()?")
    return vectorstore

def build_prompt(context, question):
    return f"""
    You are a helpful AI assistant. Answer the question based on the given document.
    {context}
    Keep the responses crisp, short, and to the point.

    If you are highly confident in the response, provide a precise answer.
    If the context is insufficient, attempt to provide partial information instead of stating no information at all.

    Wrap up each answer with a fun or friendly line inviting the user to ask another question —  
    or suggest they check out the podcast for more cool details about the product.
    Be a little creative and vary this closing line each time to keep it engaging.

    Question: {question}
    Answer:
    """