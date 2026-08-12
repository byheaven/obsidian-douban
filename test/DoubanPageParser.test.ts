import {load} from "cheerio";
import {readFileSync} from "fs";
import {join} from "path";
import DoubanPageParser from "../src/org/wanxp/utils/DoubanPageParser";

describe("DoubanPageParser", () => {
	const fixture = readFileSync(join(__dirname, "fixtures/user-state.html"), "utf8");

	it("parses tags and comments by meaning instead of sibling offsets", () => {
		const html = load(load(fixture)("#music-with-comment").html());
		expect(DoubanPageParser.parseUserTags(html)).toEqual(["氛围", "流行"]);
		expect(DoubanPageParser.parseUserComment(html)).toBe("保留空格的真实短评");
	});

	it("does not treat tags as a comment when the comment is absent", () => {
		const html = load(load(fixture)("#game-without-comment").html());
		expect(DoubanPageParser.parseUserTags(html)).toEqual(["RPG", "独立游戏"]);
		expect(DoubanPageParser.parseUserComment(html)).toBeNull();
	});

	it("survives wrapper changes and normalizes description whitespace", () => {
		const html = load(load(fixture)("#changed-wrappers").html());
		expect(DoubanPageParser.parseUserTags(html)).toEqual(["小说", "历史"]);
		expect(DoubanPageParser.parseUserComment(html)).toBe("DOM 改版后仍能识别的短评");
		expect(DoubanPageParser.normalizeText("  第一行  \r\n\t第二行\n\n\n 第三行 ")).toBe("第一行\n第二行\n\n第三行");
	});

	it("collects every linked publisher without duplicating separator text nodes", () => {
		const html = load(`<div id="info"><span class="pl">出版社:</span>
			<a>辽宁人民出版社</a> / <a>广西师范大学出版社</a><br></div>`);
		const label = html('#info span.pl').get(0);
		expect(DoubanPageParser.collectFollowingFieldText(html, label))
			.toBe("辽宁人民出版社 / 广西师范大学出版社");
	});

	it("prefers the expanded movie summary used by current Douban pages", () => {
		const html = load(`<div class="indent" id="link-report-intra">
			<span class="short"><span property="v:summary">截断简介...</span></span>
			<span class="all hidden">完整简介第一行<br>完整简介第二行</span>
		</div>`);
		expect(DoubanPageParser.extractText(html, [
			"[id^='link-report'] > span.all.hidden",
			"span[property='v:summary']",
		])).toBe("完整简介第一行\n完整简介第二行");
	});
});
