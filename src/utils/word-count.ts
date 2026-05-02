import getReadingTime from "reading-time";

/**
 * Compute word count and reading time from raw markdown/HTML content.
 * This extracts plain text from both markdown and inline HTML,
 * handling CJK characters separately for accurate counting.
 */
export function computeWordCount(rawBody: string | undefined): {
	words: number;
	minutes: number;
	excerpt: string;
} {
	if (!rawBody) {
		return { words: 0, minutes: 1, excerpt: "" };
	}

	// Strip code blocks (```...```) first to avoid counting code
	let text = rawBody.replace(/```[\s\S]*?```/g, " ");

	// Strip inline code (`...`)
	text = text.replace(/`[^`]*`/g, " ");

	// Strip HTML tags
	text = text.replace(/<[^>]*>/g, " ");

	// Strip HTML entities
	text = text.replace(/&[a-zA-Z]+;/g, " ");
	text = text.replace(/&#\d+;/g, " ");

	// Strip markdown image syntax ![alt](url)
	text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");

	// Strip markdown link syntax [text](url) - keep the text
	text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");

	// Strip markdown frontmatter (---...---)
	text = text.replace(/^---[\s\S]*?---/m, "");

	// Strip markdown heading markers
	text = text.replace(/^#{1,6}\s+/gm, "");

	// Strip markdown bold/italic markers
	text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
	text = text.replace(/_{1,3}([^_]+)_{1,3}/g, "$1");

	// Collapse whitespace
	text = text.replace(/\s+/g, " ").trim();

	let excerpt = "";
	const moreMatch = rawBody.match(/<!--\s*more\s*-->/i);
	if (moreMatch && moreMatch.index !== undefined) {
		const excerptRaw = rawBody.substring(0, moreMatch.index);
		excerpt = excerptRaw
			.replace(/```[\s\S]*?```/g, " ")
			.replace(/<[^>]*>/g, " ")
			.replace(/^---[\s\S]*?---/m, "")
			.replace(/\s+/g, " ")
			.trim();
	} else {
		excerpt = text.substring(0, 300) + (text.length > 300 ? "..." : "");
	}

	if (text.length === 0) {
		return { words: 0, minutes: 1, excerpt: "" };
	}

	// CJK character counting
	const cjkPattern =
		/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/g;
	const cjkMatches = text.match(cjkPattern);
	const cjkCount = cjkMatches ? cjkMatches.length : 0;

	// Non-CJK word counting
	const nonCjkText = text.replace(cjkPattern, " ");
	const nonCjkStats = getReadingTime(nonCjkText);

	const totalWords = nonCjkStats.words + cjkCount;

	// Reading time: English 200 words/min, CJK 400 chars/min
	const minutes = nonCjkStats.words / 200 + cjkCount / 400;

	return {
		words: totalWords,
		minutes: Math.max(1, Math.round(minutes)),
		excerpt,
	};
}
