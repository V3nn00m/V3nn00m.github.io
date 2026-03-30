import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { initPostIdMap } from "@utils/permalink-utils";
import { getCategoryUrl, getPostUrl } from "@utils/url-utils";
import { type CollectionEntry, getCollection } from "astro:content";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		// 首先按置顶状态排序，置顶文章在前
		if (a.data.pinned && !b.data.pinned) {
			return -1;
		}
		if (!a.data.pinned && b.data.pinned) {
			return 1;
		}

		// 如果置顶状态相同，优先按 Priority 排序（数值越小越靠前）
		if (a.data.pinned && b.data.pinned) {
			const priorityA = a.data.priority;
			const priorityB = b.data.priority;
			if (priorityA !== undefined && priorityB !== undefined) {
				if (priorityA !== priorityB) {
					return priorityA - priorityB;
				}
			} else if (priorityA !== undefined) {
				return -1;
			} else if (priorityB !== undefined) {
				return 1;
			}
		}

		// 否则按发布日期排序
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export interface PostForList {
	id: string;
	data: CollectionEntry<"posts">["data"];
	url?: string; // 预计算的文章 URL
}
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// 初始化文章 ID 映射（用于 permalink 功能）
	initPostIdMap(sortedFullPosts);

	// delete post.body，并预计算 URL
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
		url: getPostUrl(post),
	}));

	return sortedPostsList;
}

// ─── Series Support ────────────────────────────────────────────────────────────

/** Represents a whole series collapsed into one list item */
export interface SeriesItem {
	_type: "series";
	id: string; // series slug, e.g. "re4b"
	title: string;
	description: string;
	image: string;
	postCount: number;
	latestPublished: Date;
	tags: string[];
	pinned: boolean;
}

/** A single item that can appear in the main post list */
export type PostListItem = CollectionEntry<"posts"> | SeriesItem;

/** Returns true if the item is a SeriesItem */
export function isSeriesItem(item: PostListItem): item is SeriesItem {
	return (item as SeriesItem)._type === "series";
}

/**
 * Returns the main post list where:
 * - Posts that belong to a series are COLLAPSED into one SeriesItem
 * - Regular posts keep their original CollectionEntry shape
 * Result is sorted by date (most recent first), pinned posts first.
 */
export async function getSortedPostsWithSeries(): Promise<PostListItem[]> {
	const allPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	// Separate series posts from regular posts
	const seriesPosts = allPosts.filter((p) => p.data.series);
	const regularPosts = allPosts.filter((p) => !p.data.series);

	// Group series posts by series slug
	const seriesMap = new Map<
		string,
		{ posts: CollectionEntry<"posts">[]; data: CollectionEntry<"posts">["data"] }
	>();

	for (const post of seriesPosts) {
		const slug = post.data.series!;
		if (!seriesMap.has(slug)) {
			seriesMap.set(slug, { posts: [], data: post.data });
		}
		const entry = seriesMap.get(slug)!;
		entry.posts.push(post);
		// Keep data from the post with the most info (highest seriesOrder = latest chapter info)
		if ((post.data.seriesOrder ?? 0) >= (entry.data.seriesOrder ?? 0)) {
			entry.data = post.data;
		}
	}

	// Build SeriesItem list
	const seriesItems: SeriesItem[] = Array.from(seriesMap.entries()).map(
		([slug, { posts, data }]) => {
			// Sort posts by date to get the most recent publish date
			const sorted = [...posts].sort(
				(a, b) =>
					new Date(b.data.published).getTime() -
					new Date(a.data.published).getTime(),
			);
			// Collect all unique tags
			const allTags = [...new Set(posts.flatMap((p) => p.data.tags || []))];
			return {
				_type: "series",
				id: slug,
				title: data.seriesTitle || slug,
				description: data.seriesDescription || "",
				image: data.seriesImage || data.image || "",
				postCount: posts.length,
				latestPublished: new Date(sorted[0].data.published),
				tags: allTags,
				pinned: posts.some((p) => p.data.pinned),
			};
		},
	);

	// Sort regular posts by date (pinned first)
	const sortedRegular = regularPosts.sort((a, b) => {
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;
		return (
			new Date(b.data.published).getTime() -
			new Date(a.data.published).getTime()
		);
	});

	// Merge all items and sort again (series by their latest date, pinned first)
	const allItems: PostListItem[] = [
		...sortedRegular,
		...seriesItems,
	];

	allItems.sort((a, b) => {
		const aDate = isSeriesItem(a)
			? a.latestPublished
			: new Date((a as CollectionEntry<"posts">).data.published);
		const bDate = isSeriesItem(b)
			? b.latestPublished
			: new Date((b as CollectionEntry<"posts">).data.published);
		const aPinned = isSeriesItem(a) ? a.pinned : (a as CollectionEntry<"posts">).data.pinned;
		const bPinned = isSeriesItem(b) ? b.pinned : (b as CollectionEntry<"posts">).data.pinned;

		if (aPinned && !bPinned) return -1;
		if (!aPinned && bPinned) return 1;
		return bDate.getTime() - aDate.getTime();
	});

	return allItems;
}

export interface Tag {
	name: string;
	count: number;
}

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: Record<string, number> = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) {
				countMap[tag] = 0;
			}
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export interface Category {
	name: string;
	count: number;
	url: string;
}

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: Record<string, number> = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}

/**
 * 对标题进行分词，支持中英文混合
 *
 * - 优先使用 Intl.Segmenter（在支持的运行时中效果更好）
 * - 在不支持 Segmenter 的环境（如部分 Node 运行时）下
 *   回退到基于正则的简单分词，以避免构建报错
 * - 过滤标点和空白，英文统一小写
 */
function tokenizeTitle(title: string): Set<string> {
	const tokens = new Set<string>();

	// 运行时可能不支持 Intl.Segmenter（例如部分 Node 环境）
	// 为了避免 SSR/构建时报错，这里做兼容处理
	const hasSegmenter =
		typeof Intl !== "undefined" &&
		"Segmenter" in Intl &&
		typeof (Intl as any).Segmenter === "function";

	if (!hasSegmenter) {
		// 简单回退方案：按照空白和标点拆分
		const basicTokens = title
			.toLowerCase()
			.split(/[\s\p{P}]+/gu)
			.filter(Boolean);
		for (const t of basicTokens) {
			tokens.add(t);
		}
		return tokens;
	}

	// 使用 Intl.Segmenter 进行更精细的中英文混合分词
	const segmenter = new (Intl as any).Segmenter("zh", {
		granularity: "word",
	});
	for (const { segment, isWordLike } of segmenter.segment(title)) {
		if (!isWordLike) {
			continue;
		}
		tokens.add((segment as string).toLowerCase());
	}
	return tokens;
}

/**
 * 计算两个集合的 Jaccard 相似度
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) {
		return 0;
	}
	let intersection = 0;
	for (const item of a) {
		if (b.has(item)) {
			intersection++;
		}
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * 获取相关文章推荐
 * 评分公式: totalScore = tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus
 * - tagMatchScore (0-100): 标签 Jaccard 相似度 × 100
 * - titleSimilarityScore (0-100): 标题分词 Jaccard 相似度 × 100
 * - timeFreshnessScore (0-30): 6 个月半衰期指数衰减
 * - categoryBonus (0 or 10): 同分类加 10 分
 */
export async function getRelatedPosts(
	currentPost: CollectionEntry<"posts">,
	maxCount = 5,
): Promise<PostForList[]> {
	const allPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	// 排除自身和加密文章
	const candidates = allPosts.filter(
		(p) => p.id !== currentPost.id && !p.data.password,
	);

	const currentTags = new Set(currentPost.data.tags || []);
	const currentTokens = tokenizeTitle(currentPost.data.title);
	const currentCategory = currentPost.data.category || "";
	const now = Date.now();

	const scored = candidates.map((post) => {
		const postTags = new Set(post.data.tags || []);

		// tagMatchScore (0-100)
		const tagMatchScore = jaccardSimilarity(currentTags, postTags) * 100;

		// titleSimilarityScore (0-100)
		const postTokens = tokenizeTitle(post.data.title);
		const titleSimilarityScore =
			jaccardSimilarity(currentTokens, postTokens) * 100;

		// timeFreshnessScore (0-30): 6 个月半衰期
		const daysSincePublished =
			(now - new Date(post.data.published).getTime()) /
			(1000 * 60 * 60 * 24);
		const timeFreshnessScore =
			30 * Math.exp((-Math.LN2 * daysSincePublished) / 180);

		// categoryBonus (0 or 10)
		const postCategory = post.data.category || "";
		const categoryBonus =
			currentCategory && postCategory && currentCategory === postCategory
				? 10
				: 0;

		const totalScore =
			tagMatchScore +
			titleSimilarityScore +
			timeFreshnessScore +
			categoryBonus;

		return {
			post,
			totalScore,
			tagMatchScore,
			timeFreshnessScore,
			categoryBonus,
		};
	});

	// 按总分降序排列
	scored.sort((a, b) => b.totalScore - a.totalScore);

	// 优先取有标签匹配的
	const withTagMatch = scored.filter((s) => s.tagMatchScore > 0);
	const withoutTagMatch = scored.filter((s) => s.tagMatchScore === 0);

	const result: PostForList[] = [];

	for (const s of withTagMatch) {
		if (result.length >= maxCount) {
			break;
		}
		result.push({ id: s.post.id, data: s.post.data });
	}

	// 不足时从剩余候选中按 timeFreshnessScore + categoryBonus 降序补充
	if (result.length < maxCount) {
		withoutTagMatch.sort(
			(a, b) =>
				b.timeFreshnessScore +
				b.categoryBonus -
				(a.timeFreshnessScore + a.categoryBonus),
		);
		for (const s of withoutTagMatch) {
			if (result.length >= maxCount) {
				break;
			}
			result.push({ id: s.post.id, data: s.post.data });
		}
	}

	return result;
}
