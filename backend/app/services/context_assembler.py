from app.services.chunking_service import count_tokens

class ContextAssembler:
    def build(
        self,
        universals: list,        # UniversalFact ORM objects (from PostgreSQL)
        memories: list[dict],    # Qdrant results [{score, payload}]
        doc_chunks: list[dict],  # Qdrant results [{score, payload}]
        token_budget: int = 3200,
    ) -> str:
        if not universals and not memories and not doc_chunks:
            return ""   # new user, no memory yet — return empty string, not placeholder text

        sections = []

        # 1. Universal facts — ALWAYS included, never trimmed
        universal_text = self._format_universals(universals)
        if universal_text:
            sections.append(f"=== Always Remember ===\n{universal_text}")

        used_tokens = count_tokens("\n\n".join(sections)) if sections else 0
        remaining = token_budget - used_tokens

        # 2. Memories — trim lowest scores first if needed
        memory_text = self._fit_results(memories, remaining // 2, "raw_text")
        if memory_text:
            sections.append(f"=== Relevant Context From Past Conversations ===\n{memory_text}")
            # Recalculate remaining budget after adding memories
            used_tokens = count_tokens("\n\n".join(sections))
            remaining = token_budget - used_tokens

        # 3. Document chunks — trim lowest scores first
        chunk_text = self._fit_results(doc_chunks, remaining, "content", include_source=True)
        if chunk_text:
            sections.append(f"=== Document Context ===\n{chunk_text}")

        return "\n\n".join(sections)

    def _format_universals(self, universals: list) -> str:
        active = [u for u in universals if getattr(u, 'is_active', True)]
        if not active:
            return ""
        return "\n".join(f"- {u.content}" for u in active)

    def _fit_results(self, results: list[dict], budget: int, content_key: str, include_source: bool = False) -> str:
        if not results or budget <= 0:
            return ""

        # Sort by score descending (best first)
        sorted_results = sorted(results, key=lambda r: r.get("score", 0), reverse=True)
        lines, used = [], 0

        for r in sorted_results:
            p = r.get("payload", {})
            content = p.get(content_key, "")
            if not content:
                continue

            if include_source:
                source = p.get("doc_filename", "document")
                page = f" p.{p['page_number']}" if p.get("page_number") else ""
                line = f"[{source}{page}]\n{content}"
            else:
                line = f"- {content}"

            tokens = count_tokens(line)
            if used + tokens > budget:
                break

            lines.append(line)
            used += tokens

        return "\n\n".join(lines) if include_source else "\n".join(lines)

context_assembler = ContextAssembler()