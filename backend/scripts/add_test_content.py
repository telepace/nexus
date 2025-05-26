#!/usr/bin/env python3
"""
Script to add test content items to the database.
This script creates sample content items for testing the Content Library feature.
"""

from sqlmodel import Session, select

from app.core.db_factory import engine
from app.models import User
from app.models.content import ContentItem


def create_test_content_items():
    """Create test content items for the first user in the database."""

    with Session(engine) as session:
        # Get the first user from the database
        user = session.exec(select(User).limit(1)).first()

        if not user:
            print("❌ No users found in database. Please create a user first.")
            return

        print(f"✅ Found user: {user.email} (ID: {user.id})")

        # Check if content items already exist for this user
        existing_items = session.exec(
            select(ContentItem).where(ContentItem.user_id == user.id)
        ).all()

        if existing_items:
            print(
                f"ℹ️  User already has {len(existing_items)} content items. Skipping creation."
            )
            return

        # Sample content items
        test_items = [
            {
                "type": "pdf",
                "source_uri": "https://arxiv.org/pdf/2103.00020.pdf",
                "title": "Attention Is All You Need",
                "summary": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
                "processing_status": "completed",
            },
            {
                "type": "url",
                "source_uri": "https://openai.com/blog/chatgpt",
                "title": "Introducing ChatGPT",
                "summary": "We've trained a model called ChatGPT which interacts in a conversational way. The dialogue format makes it possible for ChatGPT to answer followup questions, admit its mistakes, challenge incorrect premises, and reject inappropriate requests.",
                "processing_status": "completed",
            },
            {
                "type": "text",
                "source_uri": None,
                "title": "Meeting Notes - Q1 Planning",
                "summary": "Quarterly planning meeting notes covering product roadmap, resource allocation, and key milestones for the upcoming quarter.",
                "processing_status": "completed",
            },
            {
                "type": "pdf",
                "source_uri": "https://example.com/research-paper.pdf",
                "title": "Machine Learning in Healthcare",
                "summary": "A comprehensive review of machine learning applications in healthcare, covering diagnostic imaging, drug discovery, and personalized medicine.",
                "processing_status": "pending",
            },
            {
                "type": "url",
                "source_uri": "https://blog.example.com/ai-trends-2024",
                "title": "AI Trends 2024",
                "summary": "An analysis of emerging artificial intelligence trends and their potential impact on various industries in 2024.",
                "processing_status": "processing",
            },
            {
                "type": "docx",
                "source_uri": "https://example.com/document.docx",
                "title": "Project Proposal",
                "summary": "Detailed project proposal outlining objectives, methodology, timeline, and expected outcomes for the new initiative.",
                "processing_status": "failed",
            },
        ]

        created_items = []

        for item_data in test_items:
            content_item = ContentItem(user_id=user.id, **item_data)
            session.add(content_item)
            created_items.append(content_item)

        try:
            session.commit()
            print(f"✅ Successfully created {len(created_items)} test content items:")

            for item in created_items:
                print(f"   📄 {item.title} ({item.type}) - {item.processing_status}")

        except Exception as e:
            session.rollback()
            print(f"❌ Error creating test content items: {e}")
            raise


if __name__ == "__main__":
    print("🚀 Adding test content items...")
    create_test_content_items()
    print("✨ Done!")
