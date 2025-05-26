#!/usr/bin/env python3
"""Test script for content chunker."""

from app.utils.content_chunker import ContentChunker

def test_chunker():
    content = '''# Test Document

This is a test document with multiple sections.

## Section 1

This is the first section with some content. It contains multiple paragraphs to test the chunking algorithm.

Here is another paragraph in the first section.

## Section 2

This is the second section. It has different content and structure.

### Subsection 2.1

This is a subsection with more detailed content.

```python
def example_code():
    print("This is a code block")
    return True
```

## Section 3

Final section with conclusion.

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

- List item 1
- List item 2
- List item 3
'''

    chunker = ContentChunker(max_chunk_size=300)
    chunks = chunker.chunk_markdown_content(content)
    
    print(f'Generated {len(chunks)} chunks:')
    print('=' * 50)
    
    for i, chunk in enumerate(chunks):
        print(f'Chunk {i + 1}:')
        print(f'  Type: {chunk.chunk_type}')
        print(f'  Characters: {chunk.char_count}')
        print(f'  Words: {chunk.word_count}')
        print(f'  Meta info: {chunk.meta_info}')
        print(f'  Content preview: {chunk.content[:100]}...')
        print('-' * 30)

if __name__ == "__main__":
    test_chunker() 